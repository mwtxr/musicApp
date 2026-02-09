// Supabase 客户端配置
// 已配置完成

const SUPABASE_URL = 'https://vyndievmkqermgunaqns.supabase.co'
const SUPABASE_ANON_KEY = 'sbp_8cd9b8c33c92fc2512f2b5b83d8627553d7859a4'

// 创建客户端
const createClient = () => {
  // #ifdef H5
  return uni.supabase = uni.supabase || supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  // #endif
  
  // 小程序环境
  return require('@supabase/supabase-js').createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export const supabase = createClient()

// 生成6位房间码
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 匿名登录
export const anonymousLogin = async () => {
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user
}

// 创建或获取用户资料
export const getOrCreateProfile = async (userId, nickname) => {
  // 先查询
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (existing) return existing
  
  // 不存在则创建
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({ id: userId, nickname: nickname || `用户${Math.random().toString(36).substr(2, 6)}` })
    .select()
    .single()
  
  if (error) throw error
  return newProfile
}

// 创建房间
export const createRoom = async (hostId) => {
  const code = generateRoomCode()
  const { data, error } = await supabase
    .from('rooms')
    .insert({ 
      host_id: hostId,
      code: code,
      current_music: null,
      playback_status: { isPlaying: false, progress: 0, timestamp: Date.now() }
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 通过房间码加入房间
export const joinRoom = async (roomCode, userId) => {
  // 先找到房间
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('code', roomCode.toUpperCase())
    .single()
  
  if (roomError) throw new Error('房间不存在')
  
  // 添加用户到房间
  const { error: joinError } = await supabase
    .from('room_users')
    .insert({ room_id: room.id, user_id: userId })
  
  if (joinError && !joinError.message.includes('duplicate key')) {
    throw joinError
  }
  
  return room
}

// 离开房间
export const leaveRoom = async (roomId, userId) => {
  await supabase
    .from('room_users')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
}

// 同步播放状态
export const updatePlaybackStatus = async (roomId, status) => {
  await supabase
    .from('rooms')
    .update({ playback_status: status, current_music: status.music })
    .eq('id', roomId)
}

// 发送聊天消息
export const sendMessage = async (roomId, userId, content) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, user_id: userId, content })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 获取房间信息
export const getRoomInfo = async (roomId) => {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      profiles (nickname, avatar_url)
    `)
    .eq('id', roomId)
    .single()
  
  if (error) throw error
  return data
}

// 获取房间用户列表
export const getRoomUsers = async (roomId) => {
  const { data, error } = await supabase
    .from('room_users')
    .select(`
      *,
      profiles (id, nickname, avatar_url)
    `)
    .eq('room_id', roomId)
  
  if (error) throw error
  return data
}

// 获取聊天历史
export const getChatHistory = async (roomId, limit = 50) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles (nickname, avatar_url)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  return data
}

// 订阅房间变化
export const subscribeToRoom = (roomId, callbacks) => {
  return supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'rooms',
      filter: `id=eq.${roomId}`
    }, (payload) => {
      callbacks.onRoomUpdate?.(payload.new)
    })
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'chat_messages',
      filter: `room_id=eq.${roomId}`
    }, async (payload) => {
      // 获取发送者信息
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles(nickname, avatar_url)')
        .eq('id', payload.new.id)
        .single()
      callbacks.onNewMessage?.(data)
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'room_users',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      callbacks.onUserUpdate?.(payload.new)
    })
    .subscribe()
}

// 取消订阅
export const unsubscribeFromRoom = (channel) => {
  supabase.removeChannel(channel)
}
