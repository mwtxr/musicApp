<template>
  <view class="container">
    <!-- 用户信息 -->
    <view class="user-info" v-if="user">
      <text class="nickname">{{ user.user_metadata?.nickname || '匿名用户' }}</text>
    </view>

    <!-- 功能区 -->
    <view class="actions">
      <!-- 创建房间 -->
      <button class="btn primary" @click="handleCreateRoom">
        创建房间 🎵
      </button>
      
      <!-- 分隔线 -->
      <view class="divider">
        <text>或</text>
      </view>
      
      <!-- 加入房间 -->
      <view class="join-form">
        <input 
          class="room-code-input" 
          v-model="roomCode" 
          placeholder="输入房间码" 
          maxlength="6"
          @confirm="handleJoinRoom"
        />
        <button class="btn secondary" @click="handleJoinRoom" :disabled="!roomCode">
          加入房间 🚪
        </button>
      </view>
    </view>

    <!-- 房间码显示 -->
    <view class="tips" v-if="createdRoomCode">
      <text>房间码: {{ createdRoomCode }}</text>
      <text class="hint">分享给你的朋友吧！</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase, anonymousLogin, getOrCreateProfile, createRoom, joinRoom } from '@/utils/supabase.js'

const user = ref(null)
const roomCode = ref('')
const createdRoomCode = ref('')
const isLoading = ref(false)

onMounted(async () => {
  // 检查登录状态
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    user.value = session.user
  }
})

// 登录
const login = async () => {
  try {
    isLoading.value = true
    const authUser = await anonymousLogin()
    const profile = await getOrCreateProfile(authUser.id, `用户${Math.random().toString(36).substr(2, 6)}`)
    user.value = { ...authUser, ...profile }
  } catch (e) {
    console.error('登录失败:', e)
    uni.showToast({ title: '登录失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

// 创建房间
const handleCreateRoom = async () => {
  if (!user.value) {
    await login()
    if (!user.value) return
  }
  
  try {
    isLoading.value = true
    uni.showLoading({ title: '创建中...' })
    
    const room = await createRoom(user.value.id)
    createdRoomCode.value = room.code
    
    // 自动加入房间
    await joinRoom(room.code, user.value.id)
    
    uni.hideLoading()
    uni.showToast({ title: '创建成功', icon: 'success' })
    
    // 跳转到房间
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/room/room?id=${room.id}`
      })
    }, 1000)
  } catch (e) {
    uni.hideLoading()
    console.error('创建房间失败:', e)
    uni.showToast({ title: '创建失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

// 加入房间
const handleJoinRoom = async () => {
  if (!roomCode.value || roomCode.value.length !== 6) {
    uni.showToast({ title: '请输入6位房间码', icon: 'none' })
    return
  }
  
  if (!user.value) {
    await login()
    if (!user.value) return
  }
  
  try {
    isLoading.value = true
    uni.showLoading({ title: '加入中...' })
    
    const room = await joinRoom(roomCode.value.toUpperCase(), user.value.id)
    
    uni.hideLoading()
    uni.showToast({ title: '加入成功', icon: 'success' })
    
    // 跳转到房间
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/room/room?id=${room.id}`
      })
    }, 1000)
  } catch (e) {
    uni.hideLoading()
    console.error('加入房间失败:', e)
    uni.showToast({ title: e.message || '加入失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
}

.user-info {
  margin-bottom: 80rpx;
  
  .nickname {
    color: #fff;
    font-size: 36rpx;
    font-weight: bold;
  }
}

.actions {
  width: 100%;
  max-width: 600rpx;
}

.btn {
  width: 100%;
  height: 100rpx;
  border-radius: 50rpx;
  font-size: 34rpx;
  font-weight: bold;
  border: none;
  margin-bottom: 30rpx;
  
  &.primary {
    background: linear-gradient(90deg, #ff6b6b, #ee5a24);
    color: #fff;
    box-shadow: 0 10rpx 30rpx rgba(238, 90, 36, 0.4);
  }
  
  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border: 2rpx solid rgba(255, 255, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
  }
}

.divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0;
  
  text {
    color: rgba(255, 255, 255, 0.5);
    font-size: 28rpx;
    padding: 0 30rpx;
    background: transparent;
  }
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1rpx;
    background: rgba(255, 255, 255, 0.2);
  }
}

.join-form {
  .room-code-input {
    width: 100%;
    height: 100rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50rpx;
    padding: 0 40rpx;
    margin-bottom: 30rpx;
    color: #fff;
    font-size: 32rpx;
    text-align: center;
    letter-spacing: 8rpx;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 2rpx;
    }
  }
}

.tips {
  margin-top: 60rpx;
  text-align: center;
  
  text {
    display: block;
    color: #fff;
    font-size: 32rpx;
    margin-bottom: 20rpx;
  }
  
  .hint {
    color: rgba(255, 255, 255, 0.6);
    font-size: 24rpx;
  }
}
</style>
