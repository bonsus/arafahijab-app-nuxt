export interface AddressState {
  country: string
  province: string
  city: string
  district: string
  postal_code: string
}

export function useAddressSelect(state: AddressState) {
  const api = useApi()

  const countries = ref<string[]>([])
  const provinces = ref<string[]>([])
  const cities = ref<string[]>([])
  const districts = ref<string[]>([])
  const zipcodes = ref<string[]>([])

  const loadingCountries = ref(false)
  const loadingProvinces = ref(false)
  const loadingCities = ref(false)
  const loadingDistricts = ref(false)
  const loadingZipcodes = ref(false)

  async function fetchCountries() {
    loadingCountries.value = true
    try {
      const res = await api.get<{ data: { country: string }[] }>('/addresses/')
      countries.value = res.data?.map((d: { country: string }) => d.country) || []
    } catch {
      countries.value = []
    } finally {
      loadingCountries.value = false
    }
  }

  async function fetchProvinces() {
    if (!state.country) {
      provinces.value = []
      return
    }
    loadingProvinces.value = true
    try {
      const res = await api.get<{ data: { country: string; province: string }[] }>('/addresses/provinces')
      provinces.value = res.data?.map((d: { province: string }) => d.province) || []
    } catch {
      provinces.value = []
    } finally {
      loadingProvinces.value = false
    }
  }

  async function fetchCities() {
    if (!state.province) {
      cities.value = []
      return
    }
    loadingCities.value = true
    try {
      const res = await api.get<{ data: { cities: { city: string }[] } }>('/addresses/cities', {
        province: state.province,
      })
      cities.value = res.data?.cities?.map((d: { city: string }) => d.city) || []
    } catch {
      cities.value = []
    } finally {
      loadingCities.value = false
    }
  }

  async function fetchDistricts() {
    if (!state.province || !state.city) {
      districts.value = []
      return
    }
    loadingDistricts.value = true
    try {
      const res = await api.get<{ data: { districts: { district: string }[] } }>('/addresses/districts', {
        province: state.province,
        city: state.city,
      })
      districts.value = res.data?.districts?.map((d: { district: string }) => d.district) || []
    } catch {
      districts.value = []
    } finally {
      loadingDistricts.value = false
    }
  }

  async function fetchZipcodes() {
    if (!state.province || !state.city || !state.district) {
      zipcodes.value = []
      return
    }
    loadingZipcodes.value = true
    try {
      const res = await api.get<{ data: { zipcodes: { zipcode: string }[] } }>('/addresses/zipcodes', {
        province: state.province,
        city: state.city,
        district: state.district,
      })
      zipcodes.value = res.data?.zipcodes?.map((d: { zipcode: string }) => d.zipcode) || []
    } catch {
      zipcodes.value = []
    } finally {
      loadingZipcodes.value = false
    }
  }

  function onCountryChange(val: string) {
    state.country = val
    state.province = ''
    state.city = ''
    state.district = ''
    state.postal_code = ''
    provinces.value = []
    cities.value = []
    districts.value = []
    zipcodes.value = []
    if (val) fetchProvinces()
  }

  function onProvinceChange(val: string) {
    state.province = val
    state.city = ''
    state.district = ''
    state.postal_code = ''
    cities.value = []
    districts.value = []
    zipcodes.value = []
    if (val) fetchCities()
  }

  function onCityChange(val: string) {
    state.city = val
    state.district = ''
    state.postal_code = ''
    districts.value = []
    zipcodes.value = []
    if (val) fetchDistricts()
  }

  function onDistrictChange(val: string) {
    state.district = val
    state.postal_code = ''
    zipcodes.value = []
    if (val) fetchZipcodes()
  }

  function onPostalCodeChange(val: string) {
    state.postal_code = val
  }

  /** Load initial data based on current state (e.g. when editing existing data) */
  async function initFromState() {
    await fetchCountries()
    if (state.country) {
      await fetchProvinces()
      if (state.province) {
        await fetchCities()
        if (state.city) {
          await fetchDistricts()
          if (state.district) {
            await fetchZipcodes()
          }
        }
      }
    }
  }

  return {
    countries,
    provinces,
    cities,
    districts,
    zipcodes,
    loadingCountries,
    loadingProvinces,
    loadingCities,
    loadingDistricts,
    loadingZipcodes,
    fetchCountries,
    fetchProvinces,
    fetchCities,
    fetchDistricts,
    fetchZipcodes,
    onCountryChange,
    onProvinceChange,
    onCityChange,
    onDistrictChange,
    onPostalCodeChange,
    initFromState,
  }
}
