export const ok = (res, data = {}) => {
  return res.status(200).json({
    success: true,
    data,
    ...data,
  })
}

export const fail = (res, status, error) => {
  return res.status(status).json({
    success: false,
    error,
  })
}
