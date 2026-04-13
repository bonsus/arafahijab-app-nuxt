// composables/useIsClientNavigation.ts
export const useIsClientNavigation = () => {
  const isClientNavigation = useState('is-client-navigation', () => false)

  onBeforeRouteLeave(() => {
    isClientNavigation.value = true
  })

  return isClientNavigation
}
