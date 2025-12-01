import { NextFunction, Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import BadRequestError from '../errors/bad-request-error';
import NotFoundError from '../errors/not-found-error';
import Order from '../models/order';
import User, { IUser } from '../models/user';

const allowedSortFields = [
  'createdAt',
  'totalAmount',
  'orderCount',
  'lastOrderDate',
  'name',
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

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /customers
export const getCustomers = async (
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
      registrationDateFrom,
      registrationDateTo,
      lastOrderDateFrom,
      lastOrderDateTo,
      totalAmountFrom,
      totalAmountTo,
      orderCountFrom,
      orderCountTo,
      search,
    } = req.query;

    // 1. Валидация search: режем инъекцию сразу
    if (typeof search !== 'undefined' && typeof search !== 'string') {
      return next(new BadRequestError('Некорректный параметр поиска'));
    }

    if (
      typeof search === 'string' &&
      search.length > 0 &&
      !/^[\p{L}\p{N}\s-]+$/u.test(search)
    ) {
      return next(new BadRequestError('Некорректный параметр поиска'));
    }

    const filters: FilterQuery<Partial<IUser>> = {};

    const regFrom = parseDate(registrationDateFrom);
    if (regFrom) {
      filters.createdAt = {
        ...filters.createdAt,
        $gte: regFrom,
      };
    }

    const regTo = parseDate(registrationDateTo);
    if (regTo) {
      regTo.setHours(23, 59, 59, 999);
      filters.createdAt = {
        ...filters.createdAt,
        $lte: regTo,
      };
    }

    const lastFrom = parseDate(lastOrderDateFrom);
    if (lastFrom) {
      filters.lastOrderDate = {
        ...filters.lastOrderDate,
        $gte: lastFrom,
      };
    }

    const lastTo = parseDate(lastOrderDateTo);
    if (lastTo) {
      lastTo.setHours(23, 59, 59, 999);
      filters.lastOrderDate = {
        ...filters.lastOrderDate,
        $lte: lastTo,
      };
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

    if (orderCountFrom) {
      filters.orderCount = {
        ...filters.orderCount,
        $gte: Number(orderCountFrom),
      };
    }

    if (orderCountTo) {
      filters.orderCount = {
        ...filters.orderCount,
        $lte: Number(orderCountTo),
      };
    }

    // 2. Безопасный поиск по name и deliveryAddress
    if (typeof search === 'string' && search.length > 0) {
      const searchRegex = new RegExp(search, 'i');
      const orders = await Order.find(
        { deliveryAddress: searchRegex },
        '_id'
      );

      const orderIds = orders.map((order) => order._id);

      filters.$or = [
        { name: searchRegex },
        { lastOrder: { $in: orderIds } },
      ];
    }

    const field = getSortField(sortField);
    const order = getSortOrder(sortOrder);
    const sort: Record<string, 1 | -1> = { [field]: order };

    const pageNum = normalizePage(page);
    const limitNum = normalizeLimit(limit);

    const options = {
      sort,
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
    };

    const users = await User.find(filters, null, options).populate([
      'orders',
      {
        path: 'lastOrder',
        populate: { path: 'products' },
      },
      {
        path: 'lastOrder',
        populate: { path: 'customer' },
      },
    ]);

    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limitNum);

    res.status(200).json({
      customers: users,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.params.id).populate([
      'orders',
      'lastOrder',
    ]);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allowedFields = ['name', 'phone'] as const;
    type UpdatableField = (typeof allowedFields)[number];

    const updateData = allowedFields.reduce<Partial<Pick<IUser, UpdatableField>>>(
      (acc, key) => {
        if (key in req.body) {
          acc[key] = req.body[key];
        }
        return acc;
      },
      {}
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .orFail(
        () =>
          new NotFoundError(
            'Пользователь по заданному id отсутствует в базе'
          )
      )
      .populate(['orders', 'lastOrder']);

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
      () =>
        new NotFoundError(
          'Пользователь по заданному id отсутствует в базе'
        )
    );
    res.status(200).json(deletedUser);
  } catch (error) {
    next(error);
  }
};
