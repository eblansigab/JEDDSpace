import { loadDataForIntent } from './dataLoader.js'

export const handleRecommendation = async ({ viewer, payload = {} }) => {
  const data = await loadDataForIntent('recommendation', payload.message || 'recommendation', viewer)
  return { data }
}
