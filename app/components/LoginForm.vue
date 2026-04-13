<script setup lang="ts">
import Input from './ui/input/Input.vue'

</script>

<template>
  <div class="mx-auto max-w-sm bg-white rounded-lg shadow-lg border border-gray-200">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900">
        Login
      </h2>
      <p class="text-gray-600 mt-1">
        Enter your email below to login to your account
      </p>
    </div>
    <div class="p-6">
      <form class="grid gap-4">
        <div class="grid gap-2">
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div class="grid gap-2">
          <div class="flex items-center">
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <a href="#" class="ml-auto inline-block text-sm text-blue-600 hover:text-blue-500 underline">
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </div>
        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Login
        </button>
        <button
          type="button"
          class="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Login with Google
        </button>
      </form>
      <div class="mt-4 text-center text-sm text-gray-600">
        Don't have an account?
        <a href="#" class="text-blue-600 hover:text-blue-500 underline ml-1">
          Sign up
        </a>
      </div>
    </div>
  </div>
</template>
