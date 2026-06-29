import { loadDataForIntent } from './dataLoader.js'

export const handleOperations = async ({ viewer, payload = {} }) => {
  const data = await loadDataForIntent('operations', payload.message || 'operations', viewer)
  return { data }
}
