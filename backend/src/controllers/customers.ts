import { NextFunction, Request, Response } from 'express'
import { FilterQuery } from 'mongoose'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'

// Допустимые поля сортировки
const allowedSortFields = [
  'createdAt',
  'totalAmount',
  'orderCount',
  'lastOrderDate',
  'name',
] as const
type SortField = (typeof allowedSortFields)[number]

function isSortField(value: string): value is SortField {
  return (allowedSortFields as readonly string[]).includes(value)
}

function getSortField(raw: unknown): SortField {
  if (typeof raw !== 'string') return 'createdAt'
  return isSortField(raw) ? raw : 'createdAt'
}

function getSortOrder(raw: unknown): 1 | -1 {
  if (raw === 'asc') return 1
  if (raw === 'desc') return -1
  return -1
}

// TODO: Добавить guard admin
export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 10,
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
    } = req.query

    const filters: FilterQuery<Partial<IUser>> = {}

    if (registrationDateFrom) {
      filters.createdAt = {
        ...filters.createdAt,
        $gte: new Date(registrationDateFrom as string),
      }
    }

    if (registrationDateTo) {
      const endOfDay = new Date(registrationDateTo as string)
      endOfDay.setHours(23, 59, 59, 999)
      filters.createdAt = {
        ...filters.createdAt,
        $lte: endOfDay,
      }
    }

    if (lastOrderDateFrom) {
      filters.lastOrderDate = {
        ...filters.lastOrderDate,
        $gte: new Date(lastOrderDateFrom as string),
      }
    }

    if (lastOrderDateTo) {
      const endOfDay = new Date(lastOrderDateTo as string)
      endOfDay.setHours(23, 59, 59, 999)
      filters.lastOrderDate = {
        ...filters.lastOrderDate,
        $lte: endOfDay,
      }
    }

    if (totalAmountFrom) {
      filters.totalAmount = {
        ...filters.totalAmount,
        $gte: Number(totalAmountFrom),
      }
    }

    if (totalAmountTo) {
      filters.totalAmount = {
        ...filters.totalAmount,
        $lte: Number(totalAmountTo),
      }
    }

    if (orderCountFrom) {
      filters.orderCount = {
        ...filters.orderCount,
        $gte: Number(orderCountFrom),
      }
    }

    if (orderCountTo) {
      filters.orderCount = {
        ...filters.orderCount,
        $lte: Number(orderCountTo),
      }
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i')
      const orders = await Order.find(
        {
          $or: [{ deliveryAddress: searchRegex }],
        },
        '_id'
      )

      const orderIds = orders.map((order) => order._id)

      filters.$or = [
        { name: searchRegex },
        { lastOrder: { $in: orderIds } },
      ]
    }

    // Типобезопасная сортировка с whitelist
    const field = getSortField(sortField)
    const order = getSortOrder(sortOrder)
    const sort: Record<string, 1 | -1> = { [field]: order }

    const pageNum = Number(page)
    const limitNum = Number(limit)

    const options = {
      sort,
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
    }

    const users = await User.find(filters, null, options).populate([
      'orders',
      {
        path: 'lastOrder',
        populate: {
          path: 'products',
        },
      },
      {
        path: 'lastOrder',
        populate: {
          path: 'customer',
        },
      },
    ])

    const totalUsers = await User.countDocuments(filters)
    const totalPages = Math.ceil(totalUsers / limitNum)

    res.status(200).json({
      customers: users,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: pageNum,
        pageSize: limitNum,
      },
    })
  } catch (error) {
    next(error)
  }
}

// TODO: Добавить guard admin
export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.params.id).populate([
      'orders',
      'lastOrder',
    ])
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

// TODO: Добавить guard admin
export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Белый список полей, которые реально можно менять
    const allowedFields = ['name', 'phone'] as const
    type UpdatableField = (typeof allowedFields)[number]

    const updateData: Partial<Pick<IUser, UpdatableField>> = {}

    for (const key of allowedFields) {
      if (key in req.body) {
        updateData[key] = req.body[key]
      }
    }

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
      .populate(['orders', 'lastOrder'])

    res.status(200).json(updatedUser)
  } catch (error) {
    next(error)
  }
}

// TODO: Добавить guard admin
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
    )
    res.status(200).json(deletedUser)
  } catch (error) {
    next(error)
  }
}
