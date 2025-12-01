import { NextFunction, Request, Response } from 'express';
import { FilterQuery, Error as MongooseError, Types } from 'mongoose';
import BadRequestError from '../errors/bad-request-error';
import NotFoundError from '../errors/not-found-error';
import Order, { IOrder } from '../models/order';
import Product, { IProduct } from '../models/product';
import User from '../models/user';

function normalizePage(raw: unknown): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.floor(num);
}

function normalizeLimit(raw: unknown): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) return 10;
  if (num > 10) return 10;
  return Math.floor(num);
}

const allowedSortFields = [
  'createdAt',
  'totalAmount',
  'orderNumber',
  'status',
] as const;

type SortField = (typeof allowedSortFields)[number];

function isSortField(value: string): value is SortField {
  return (allowedSortFields as readonly string[]).includes(value);
}

function getSortField(raw: unknown): SortField {
  if (typeof raw !== 'string') return 'createdAt';
  return isSortField(raw) ? raw : 'createdAt';
}

function getSortOrder(raw: unknown): 1 | -1 {
  if (raw === 'asc') return 1;
  if (raw === 'desc') return -1;
  return -1;
}

function safeRegex(raw: unknown): RegExp | null {
  if (typeof raw !== 'string') return null;
  try {
    return new RegExp(raw, 'i');
  } catch {
    return null;
  }
}

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /orders...

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page,
      limit,
      sortField,
      sortOrder,
      status,
      totalAmountFrom,
      totalAmountTo,
      orderDateFrom,
      orderDateTo,
      search,
    } = req.query;

    const filters: FilterQuery<Partial<IOrder>> = {};

    if (status) {
      if (typeof status === 'string') {
        filters.status = status;
      } else if (Array.isArray(status)) {
        filters.status = { $in: status };
      }
    }

    if (totalAmountFrom) {
      filters.totalAmount = {
        ...filters.totalAmount,
        $gte: Number(totalAmountFrom),
      };
    }

    if (totalAmountTo) {
      filters.totalAmount = {
        ...filters.totalAmount,
        $lte: Number(totalAmountTo),
      };
    }

    const fromDate = parseDate(orderDateFrom);
    if (fromDate) {
      filters.createdAt = {
        ...filters.createdAt,
        $gte: fromDate,
      };
    }

    const toDate = parseDate(orderDateTo);
    if (toDate) {
      filters.createdAt = {
        ...filters.createdAt,
        $lte: toDate,
      };
    }

    const aggregatePipeline: any[] = [
      { $match: filters },
      {
        $lookup: {
          from: 'products',
          localField: 'products',
          foreignField: '_id',
          as: 'products',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      { $unwind: '$products' },
    ];

    const searchRegex = safeRegex(search);
    const searchNumber = Number(search);

    if (searchRegex || !Number.isNaN(searchNumber)) {
      const searchConditions: any[] = [];

      if (searchRegex) {
        searchConditions.push({ 'products.title': searchRegex });
      }
      if (!Number.isNaN(searchNumber)) {
        searchConditions.push({ orderNumber: searchNumber });
      }

      if (searchConditions.length) {
        aggregatePipeline.push({
          $match: {
            $or: searchConditions,
          },
        });
        filters.$or = searchConditions;
      }
    }

    const field = getSortField(sortField);
    const order = getSortOrder(sortOrder);
    const sort: Record<string, 1 | -1> = { [field]: order };

    const pageNum = normalizePage(page);
    const limitNum = normalizeLimit(limit);

    aggregatePipeline.push(
      { $sort: sort },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $group: {
          _id: '$_id',
          orderNumber: { $first: '$orderNumber' },
          status: { $first: '$status' },
          totalAmount: { $first: '$totalAmount' },
          products: { $push: '$products' },
          customer: { $first: '$customer' },
          createdAt: { $first: '$createdAt' },
        },
      }
    );

    const orders = await Order.aggregate(aggregatePipeline);
    const totalOrders = await Order.countDocuments(filters);
    const totalPages = Math.ceil(totalOrders / limitNum);

    return res.status(200).json({
      orders,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getOrdersCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.user._id;
    const { search, page, limit } = req.query;

    const pageNum = normalizePage(page);
    const limitNum = normalizeLimit(limit);

    const options = {
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
    };

    const user = await User.findById(userId)
      .populate({
        path: 'orders',
        populate: [
          { path: 'products' },
          { path: 'customer' },
        ],
      })
      .orFail(
        () =>
          new NotFoundError(
            'Пользователь по заданному id отсутствует в базе'
          )
      );

    let orders = user.orders as unknown as IOrder[];

    if (search) {
      const searchRegex = safeRegex(search);
      const searchNumber = Number(search);
      const products = searchRegex
        ? await Product.find({ title: searchRegex })
        : [];
      const productIds = products.map((product) => product._id);

      orders = orders.filter((order) => {
        const matchesProductTitle =
          searchRegex &&
          order.products.some((product) =>
            productIds.some((id) => id.equals(product._id))
          );
        const matchesOrderNumber =
          !Number.isNaN(searchNumber) &&
          order.orderNumber === searchNumber;

        return matchesOrderNumber || Boolean(matchesProductTitle);
      });
    }

    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limitNum);

    orders = orders.slice(options.skip, options.skip + options.limit);

    return res.send({
      orders,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
    })
      .populate(['customer', 'products'])
      .orFail(
        () =>
          new NotFoundError(
            'Заказ по заданному id отсутствует в базе'
          )
      );
    return res.status(200).json(order);
  } catch (error) {
    if (error instanceof MongooseError.CastError) {
      return next(new BadRequestError('Передан не валидный ID заказа'));
    }
    return next(error);
  }
};

export const getOrderCurrentUserByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = res.locals.user._id;
  try {
    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
    })
      .populate(['customer', 'products'])
      .orFail(
        () =>
          new NotFoundError(
            'Заказ по заданному id отсутствует в базе'
          )
      );
    if (!order.customer._id.equals(userId)) {
      return next(
        new NotFoundError('Заказ по заданному id отсутствует в базе')
      );
    }
    return res.status(200).json(order);
  } catch (error) {
    if (error instanceof MongooseError.CastError) {
      return next(new BadRequestError('Передан не валидный ID заказа'));
    }
    return next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const basket: IProduct[] = [];
    const products = await Product.find<IProduct>({});
    const userId = res.locals.user._id;
    const { address, payment, phone, total, email, items, comment } =
      req.body;

    const phoneRegex = /^\+7 \(\d{3}\) \d{3} \d{2} \d{2}$/;
    if (typeof phone !== 'string' || !phoneRegex.test(phone)) {
      return next(new BadRequestError('Неверный формат телефона'));
    }

    items.forEach((id: Types.ObjectId) => {
      const product = products.find((p) => p._id.equals(id));
      if (!product) {
        throw new BadRequestError(`Товар с id ${id} не найден`);
      }
      if (product.price === null) {
        throw new BadRequestError(`Товар с id ${id} не продается`);
      }
      return basket.push(product);
    });
    const totalBasket = basket.reduce((a, c) => a + c.price, 0);
    if (totalBasket !== total) {
      return next(new BadRequestError('Неверная сумма заказа'));
    }

    const newOrder = new Order({
      totalAmount: total,
      products: items,
      payment,
      phone,
      email,
      comment,
      customer: userId,
      deliveryAddress: address,
    });
    const populateOrder = await newOrder.populate(['customer', 'products']);
    await populateOrder.save();

    return res.status(200).json(populateOrder);
  } catch (error) {
    if (error instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(error.message));
    }
    return next(error);
  }
};

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.body;
    const updatedOrder = await Order.findOneAndUpdate(
      { orderNumber: req.params.orderNumber },
      { status },
      { new: true, runValidators: true }
    )
      .orFail(
        () =>
          new NotFoundError(
            'Заказ по заданному id отсутствует в базе'
          )
      )
      .populate(['customer', 'products']);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    if (error instanceof MongooseError.ValidationError) {
      return next(new BadRequestError(error.message));
    }
    if (error instanceof MongooseError.CastError) {
      return next(new BadRequestError('Передан не валидный ID заказа'));
    }
    return next(error);
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id)
      .orFail(
        () =>
          new NotFoundError(
            'Заказ по заданному id отсутствует в базе'
          )
      )
      .populate(['customer', 'products']);
    return res.status(200).json(deletedOrder);
  } catch (error) {
    if (error instanceof MongooseError.CastError) {
      return next(new BadRequestError('Передан не валидный ID заказа'));
    }
    return next(error);
  }
};
