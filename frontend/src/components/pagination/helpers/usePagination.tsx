import { AsyncThunk } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from '@store/hooks'
import { RootState, AppDispatch } from '@store/store'
import { WebLarekAPI } from '../../../utils/weblarek-api'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

interface PaginationResult<_T, U> {
  data: U[]
  totalPages: number
  currentPage: number
  limit: number
  nextPage: () => void
  prevPage: () => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
}

// T – payload thunk'а, U – тип элемента в массиве data
const usePagination = <T extends { pagination: { totalPages: number } }, U>(
  asyncAction: AsyncThunk<
    T,
    Record<string, unknown>,
    {
      state: RootState
      dispatch: AppDispatch
      extra: WebLarekAPI
      rejectedMeta?: unknown
    }
  >,
  selector: (state: RootState) => U[],
  defaultLimit: number
): PaginationResult<T, U> => {
  const dispatch = useDispatch()
  const data = useSelector(selector)
  const [searchParams, setSearchParams] = useSearchParams()
  const [totalPages, setTotalPages] = useState<number>(1)

  const currentPage = Math.min(
    Number(searchParams.get('page')) || 1,
    totalPages
  )

  const limit = Number(searchParams.get('limit')) || defaultLimit

  const updateURL = useCallback(
    (newParams: Record<string, unknown>) => {
      const updatedParams = new URLSearchParams(searchParams)
      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          updatedParams.set(key, value.toString())
        } else {
          updatedParams.delete(key)
        }
      })
      setSearchParams(updatedParams)
    },
    [searchParams, setSearchParams]
  )

  const setPage = useCallback(
    (page: number) => {
      const newPage = Math.max(1, Math.min(page, totalPages))
      updateURL({ page: newPage, limit })
    },
    [totalPages, limit, updateURL]
  )

  const setLimit = useCallback(
    (newLimit: number) => {
      updateURL({ page: 1, limit: newLimit })
    },
    [updateURL]
  )

  const fetchData = useCallback(
    async (params: Record<string, unknown>) => {
      const action = await dispatch(asyncAction(params))
      // у AsyncThunkAction есть payload с типом T
      const payload = (action as { payload: T }).payload
      setTotalPages(payload.pagination.totalPages)
    },
    [dispatch, asyncAction]
  )

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries())
    fetchData({ ...params, page: currentPage, limit }).then(() => {
      if (data.length === 0 && currentPage > 1) {
        setPage(1)
      }
    })
  }, [currentPage, limit, searchParams, data.length, fetchData, setPage])

  const nextPage = () => {
    if (currentPage < totalPages) {
      updateURL({ page: currentPage + 1, limit })
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      updateURL({ page: currentPage - 1, limit })
    }
  }

  return {
    data,
    totalPages,
    currentPage,
    limit,
    nextPage,
    prevPage,
    setPage,
    setLimit,
  }
}

export default usePagination
