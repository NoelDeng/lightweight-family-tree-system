/**
 * Service Worker 注册工具
 */

/**
 * 注册Service Worker
 * @param {string} swPath - Service Worker路径
 */
export function registerServiceWorker(swPath = '/service-worker.js') {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log('✅ Service Worker 注册成功:', registration.scope)

          // 监听更新事件
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            console.log('🔄 Service Worker 更新检测到')

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🆕 Service Worker 已更新，等待用户刷新页面')
              }
            })
          })

          // 返回注册对象
          return registration
        })
        .catch((error) => {
          console.error('❌ Service Worker 注册失败:', error)
        })
    })
  } else {
    console.warn('⚠️ 浏览器不支持 Service Worker')
  }
}

/**
 * 获取Service Worker状态
 */
export async function getServiceWorkerStatus() {
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      active: false,
      waiting: false,
      installing: false,
      controller: false
    }
  }

  const registration = await navigator.serviceWorker.getRegistration()

  if (!registration) {
    return {
      supported: true,
      active: false,
      waiting: false,
      installing: false,
      controller: false
    }
  }

  return {
    supported: true,
    active: !!registration.active,
    waiting: !!registration.waiting,
    installing: !!registration.installing,
    controller: !!navigator.serviceWorker.controller
  }
}

/**
 * 激活Service Worker
 */
export async function activateServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration) {
      await registration.update()
      console.log('🔄 Service Worker 更新请求已发送')
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Service Worker 更新失败:', error)
    return false
  }
}

/**
 * 取消Service Worker注册
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration) {
      await registration.unregister()
      console.log('✅ Service Worker 已取消注册')
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Service Worker 取消注册失败:', error)
    return false
  }
}

/**
 * 检查Service Worker是否需要更新
 */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    return { needsUpdate: false, status: 'not-supported' }
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
      return { needsUpdate: false, status: 'not-registered' }
    }

    // 检查是否有新的service worker安装
    const newWorker = registration.installing

    if (newWorker) {
      return {
        needsUpdate: true,
        status: 'updating',
        state: newWorker.state
      }
    }

    return {
      needsUpdate: false,
      status: 'up-to-date'
    }
  } catch (error) {
    console.error('❌ 检查更新失败:', error)
    return { needsUpdate: false, status: 'error', error }
  }
}

/**
 * 缓存数据到Service Worker
 */
export async function cacheDataToSW(data) {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration && registration.active) {
      const message = {
        type: 'SYNC_DATA',
        data
      }

      registration.active.postMessage(message)
      console.log('✅ 数据已发送到Service Worker')
      return true
    }

    return false
  } catch (error) {
    console.error('❌ 数据缓存失败:', error)
    return false
  }
}

/**
 * 从Service Worker获取缓存数据
 */
export async function getCachedDataFromSW() {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration && registration.active) {
      const message = {
        type: 'GET_DATA'
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout'))
        }, 5000)

        registration.active.addEventListener('message', (event) => {
          clearTimeout(timeout)

          if (event.data && event.data.type === 'DATA_RESPONSE') {
            resolve(event.data.data)
          } else {
            reject(new Error('Invalid response'))
          }
        })
      })

      return response
    }

    return null
  } catch (error) {
    console.error('❌ 获取缓存数据失败:', error)
    return null
  }
}
