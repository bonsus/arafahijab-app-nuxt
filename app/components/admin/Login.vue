<script setup lang="ts">
import { AlertCircle, Eye, EyeClosed } from 'lucide-vue-next'

const email = ref('')
const password = ref('')
const error = ref('')
const errors = ref({
  email:[],password:[]
})
const showPassword = ref(false)
const router = useRouter()
const auth = useAuthAdminStore()

const handleLogin = async () => {
  try {
    await auth.login(email.value, password.value)
    router.push('/admin')
  } catch (err: any) {
    const er = JSON.parse(err.message)
    error.value = er?.error || ''
    errors.value = er?.errors || {}
  }
}
const logout = async () => {
  await auth.logout()
  router.push('/admin/login')
}
</script>

<template>
  <Card class="w-full max-w-sm rounded">
    <CardHeader>
      <CardTitle class="text-2xl">
        Login
      </CardTitle>
      <CardDescription>
        Enter your email below to login to your account.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <Alert v-if="error" class="border-destructive" variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription class="text-destructive">
          {{ error }}
        </AlertDescription>
      </Alert>
      <div class="grid gap-2">
        <Label for="email">Email</Label>
        <Input :aria-invalid="Array.isArray(errors.email) && errors.email.length > 0"
          v-model="email" @input="errors.email = []" id="email" type="email" placeholder="m@example.com" required />
        <p v-if="Array.isArray(errors.email) && errors.email.length > 0" class="text-sm text-destructive">
          <span v-for="(msg, index) in errors.email" :key="index">{{ msg }}</span>
        </p>
      </div>
      <div class="grid gap-2">
        <div class="relative w-full max-w-sm items-center">
          <Label for="password" class="mb-2">Password</Label>
          <span class="absolute end-0 top-8 inset-y-2 flex items-center justify-center px-2 cursor-pointer"
            @click="showPassword = !showPassword">
            <Eye v-if="showPassword" class="size-5 text-muted-foreground" />
            <EyeClosed v-else class="size-5 text-muted-foreground" />
          </span>
          <Input v-model="password" id="password" :type="showPassword ? 'text' : 'password'" placeholder="Enter your password"
            :aria-invalid="Array.isArray(errors.password) && errors.password.length > 0"
            @input="errors.password = []"/>
        </div>
        <p v-if="Array.isArray(errors.password) && errors.password.length > 0" class="text-sm text-destructive">
          <span v-for="(msg, index) in errors.password" :key="index">{{ msg }}</span>
        </p>
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full" @click="handleLogin">
        Sign in
      </Button>
      <Button class="w-full mt-2" variant="outline" @click="logout">
        Logout
      </Button>
    </CardFooter>
  </Card>
</template>
