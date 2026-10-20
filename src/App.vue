<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import PwaStatus from '@/components/PwaStatus.vue'
</script>

<template>
  <PwaStatus />
  <Toast position="top-right" />
  <RouterView />
</template>
