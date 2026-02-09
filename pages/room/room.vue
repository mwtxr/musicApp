<template>
  <view class="room-container">
    <!-- 顶部：房间信息 -->
    <view class="room-header">
      <view class="room-info">
        <text class="room-code">房间码: {{ roomInfo?.code }}</text>
        <text class="user-count">{{ users.length }} 人在线</text>
      </view>
      <button class="exit-btn" @click="handleExit">退出</button>
    </view>

    <!-- 播放器区域 -->
    <view class="player-section">
      <!-- 唱片封面 -->
      <view class="disc-container" :class="{ rotating: isPlaying }">
        <view class="disc">
          <image class="cover" :src="currentMusic?.cover || '/static/default-cover.png'" mode="aspectFill" />
        </view>
      </view>
      
      <!-- 音乐信息 -->
      <view class="music-info">
        <text class="music-title">{{ currentMusic?.title || '暂未播放' }}</text>
        <text class="music-artist">{{ currentMusic?.artist || '选择一首歌曲吧' }}</text>
      </view>
      
      <!-- 进度条 -->
      <view class="progress-bar">
        <view class="progress" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <view class="time-info">
        <text>{{ formatTime(currentProgress) }}</text>
        <text>{{ formatTime(currentMusic?.duration || 0) }}</text>
      </view>
      
      <!-- 控制按钮 -->
      <view class="player-controls">
        <view class="control-btn prev" @click="handlePrev">⏮</view>
        <view class="control-btn play" @click="handlePlay">
          {{ isPlaying ? '⏸' : '▶️' }}
        </view>
        <view class="control-btn next" @click="handleNext">⏭</view>
      </view>
    </view>

    <!-- 用户列表 -->
    <view class="users-section">
      <text class="section-title">在线伙伴</text>
      <scroll-view class="user-list" scroll-x>
        <view 
          class="user-item" 
          v-for="u in users" 
          :key="u.user_id"
          :class="{ host: u.user_id === roomInfo?.host_id }"
        >
          <image class="avatar" :src="u.profiles?.avatar_url || '/static/default-avatar.png'" />
          <text class="user-name">{{ u.profiles?.nickname || '用户' }}</text>
          <text class="host-tag" v-if="u.user_id === roomInfo?.host_id">房主</text>
        </view>
      </scroll-view>
    </view>

    <!-- 聊天区域 -->
    <view class="chat-section">
      <text class="section-title">实时聊天</text>
      
      <!-- 消息列表 -->
      <scroll-view class="messages" scroll-y :scroll-into-view="scrollToView">
        <view 
          class="message" 
          v-for="(msg, idx) in messages" 
          :key="msg.id || idx"
          :id="'msg-' + idx"
          :class="{ own: msg.user_id === currentUserId }"
        >
          <text class="msg-sender">{{ msg.profiles?.nickname || '用户' }}</text>
          <view class="msg-content">
            <text>{{ msg.content }}</text>
          </view>
        </view>
      </scroll-view>
      
      <!-- 输入框 -->
      <view class="chat-input">
        <input 
          v-model="newMessage" 
          placeholder="说点什么..." 
          confirm-type="send"
          @confirm="handleSendMessage"
        />
        <view class="send-btn" @click="handleSendMessage">发送</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getRoomInfo, 
  getRoomUsers, 
  getChatHistory,
  updatePlaybackStatus, 
  sendMessage,
  subscribeToRoom,
  unsubscribeFromRoom,
  leaveRoom
} from '@/utils/supabase.js'

const props = defineProps({
  id: String
})

const roomId = ref('')
const roomInfo = ref(null)
const users = ref([])
const messages = ref([])
const currentUserId = ref('')
const scrollToView = ref('')

// 播放状态
const isPlaying = ref(false)
const currentProgress = ref(0)
const currentMusic = ref(null)
const newMessage = ref('')

// 进度计算
const progressPercent = computed(() => {
  if (!currentMusic.value) return 0
  return (currentProgress.value / currentMusic.value.duration) * 100
})

// 格式化时间
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 加载房间信息
const loadRoomData = async () => {
  try {
    uni.showLoading({ title: '加载中...' })
    
    // 获取房间信息
    roomInfo.value = await getRoomInfo(roomId.value)
    currentMusic.value = roomInfo.value.current_music || null
    
    // 获取用户列表
    users.value = await getRoomUsers(roomId.value)
    
    // 获取聊天历史
    messages.value = await getChatHistory(roomId.value)
    
    // 获取当前用户ID
    const { data: { user } } = await uni.supabase.auth.getUser()
    currentUserId.value = user?.id || ''
    
    uni.hideLoading()
  } catch (e) {
    uni.hideLoading()
    console.error('加载失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 播放控制
const handlePlay = () => {
  isPlaying.value = !isPlaying.value
  syncPlayback()
}

const handleNext = () => {
  // TODO: 下一首
  uni.showToast({ title: '暂未实现', icon: 'none' })
}

const handlePrev = () => {
  // TODO: 上一首
  uni.showToast({ title: '暂未实现', icon: 'none' })
}

// 同步播放状态
const syncPlayback = async () => {
  if (!roomId.value) return
  
  await updatePlaybackStatus(roomId.value, {
    isPlaying: isPlaying.value,
    progress: currentProgress.value,
    timestamp: Date.now(),
    music: currentMusic.value
  })
}

// 发送消息
const handleSendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  try {
    const msg = await sendMessage(roomId.value, currentUserId.value, newMessage.value)
    messages.value.push(msg)
    newMessage.value = ''
    scrollToView.value = 'msg-' + (messages.value.length - 1)
  } catch (e) {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

// 退出房间
const handleExit = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出房间吗？',
    success: async (res) => {
      if (res.confirm) {
        await leaveRoom(roomId.value, currentUserId.value)
        uni.navigateBack()
      }
    }
  })
}

// 订阅实时更新
let subscription = null
const setupSubscription = () => {
  subscription = subscribeToRoom(roomId.value, {
    onRoomUpdate: (newRoom) => {
      roomInfo.value = newRoom
      currentMusic.value = newRoom.current_music || null
      // 同步播放状态
      if (newRoom.playback_status) {
        isPlaying.value = newRoom.playback_status.isPlaying
        // 简单同步进度
        const timeDiff = Date.now() - newRoom.playback_status.timestamp
        if (newRoom.playback_status.isPlaying) {
          currentProgress.value = newRoom.playback_status.progress + (timeDiff / 1000)
        } else {
          currentProgress.value = newRoom.playback_status.progress
        }
      }
    },
    onNewMessage: (msg) => {
      messages.value.push(msg)
      scrollToView.value = 'msg-' + (messages.value.length - 1)
    },
    onUserUpdate: async () => {
      // 重新加载用户列表
      users.value = await getRoomUsers(roomId.value)
    }
  })
}

onLoad(async (options) => {
  roomId.value = options.id
  await loadRoomData()
  setupSubscription()
})

onUnmounted(() => {
  if (subscription) {
    unsubscribeFromRoom(subscription)
  }
})

// 模拟播放进度（实际应该用 AudioContext）
let progressTimer = null
watch(isPlaying, (val) => {
  if (val) {
    progressTimer = setInterval(() => {
      if (currentProgress.value < (currentMusic.value?.duration || 0)) {
        currentProgress.value += 1
      } else {
        currentProgress.value = 0
      }
    }, 1000)
  } else {
    clearInterval(progressTimer)
  }
})
</script>

<style lang="scss" scoped>
.room-container {
  min-height: 100vh;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background: rgba(0, 0, 0, 0.3);
  
  .room-info {
    display: flex;
    align-items: center;
    gap: 20rpx;
    
    .room-code {
      font-size: 28rpx;
      font-weight: bold;
      color: #ffd700;
    }
    
    .user-count {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.6);
    }
  }
  
  .exit-btn {
    font-size: 24rpx;
    padding: 10rpx 30rpx;
    background: rgba(255, 0, 0, 0.3);
    color: #fff;
    border-radius: 30rpx;
  }
}

.player-section {
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.disc-container {
  width: 400rpx;
  height: 400rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40rpx;
  
  &.rotating {
    animation: rotate 20s linear infinite;
  }
}

.disc {
  width: 350rpx;
  height: 350rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #333, #222);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.5);
  
  .cover {
    width: 280rpx;
    height: 280rpx;
    border-radius: 50%;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.music-info {
  text-align: center;
  margin-bottom: 30rpx;
  
  .music-title {
    display: block;
    font-size: 36rpx;
    font-weight: bold;
    margin-bottom: 10rpx;
  }
  
  .music-artist {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.6);
  }
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4rpx;
  margin-bottom: 10rpx;
  overflow: hidden;
  
  .progress {
    height: 100%;
    background: linear-gradient(90deg, #ff6b6b, #ee5a24);
    border-radius: 4rpx;
    transition: width 0.5s;
  }
}

.time-info {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 30rpx;
}

.player-controls {
  display: flex;
  gap: 60rpx;
  align-items: center;
  
  .control-btn {
    font-size: 48rpx;
    
    &.play {
      font-size: 80rpx;
    }
  }
}

.users-section {
  padding: 30rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
  
  .section-title {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 20rpx;
    display: block;
  }
  
  .user-list {
    white-space: nowrap;
    
    .user-item {
      display: inline-block;
      text-align: center;
      margin-right: 30rpx;
      position: relative;
      
      .avatar {
        width: 100rpx;
        height: 100rpx;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
      }
      
      .user-name {
        display: block;
        font-size: 24rpx;
        margin-top: 10rpx;
      }
      
      .host-tag {
        position: absolute;
        top: -10rpx;
        right: 0;
        background: #ffd700;
        color: #000;
        font-size: 18rpx;
        padding: 4rpx 10rpx;
        border-radius: 10rpx;
      }
      
      &.host {
        .avatar {
          border: 4rpx solid #ffd700;
        }
      }
    }
  }
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 30rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
  min-height: 400rpx;
  
  .section-title {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 20rpx;
    display: block;
  }
  
  .messages {
    flex: 1;
    height: 400rpx;
    
    .message {
      margin-bottom: 20rpx;
      
      &.own {
        text-align: right;
        
        .msg-content {
          background: linear-gradient(90deg, #ff6b6b, #ee5a24);
        }
      }
      
      .msg-sender {
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 8rpx;
        display: block;
      }
      
      .msg-content {
        display: inline-block;
        background: rgba(255, 255, 255, 0.1);
        padding: 16rpx 24rpx;
        border-radius: 20rpx;
        max-width: 70%;
        word-break: break-all;
        
        text {
          font-size: 28rpx;
        }
      }
    }
  }
  
  .chat-input {
    display: flex;
    gap: 20rpx;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid rgba(255, 255, 255, 0.1);
    
    input {
      flex: 1;
      height: 80rpx;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 40rpx;
      padding: 0 30rpx;
      color: #fff;
      font-size: 28rpx;
    }
    
    .send-btn {
      width: 120rpx;
      height: 80rpx;
      background: linear-gradient(90deg, #ff6b6b, #ee5a24);
      border-radius: 40rpx;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 28rpx;
      font-weight: bold;
    }
  }
}
</style>
