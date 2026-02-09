-- 音乐一起听 MVP 数据库 Schema

-- 1. 用户表 (使用 Supabase Auth，这里存储扩展信息)
create table profiles (
  id uuid references auth.users not null primary key,
  nickname text unique,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. 房间表
create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null, -- 6位房间码
  host_id uuid references profiles(id),
  current_music jsonb, -- 当前播放音乐信息
  playback_status jsonb, -- 播放状态 {isPlaying, progress, timestamp}
  created_at timestamptz default now()
);

-- 3. 房间用户表
create table room_users (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id),
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

-- 4. 聊天消息表
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- 5. 启用 Realtime
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table room_users;

-- 6. 创建索引
create index idx_rooms_code on rooms(code);
create index idx_room_users_room_id on room_users(room_id);
create index idx_chat_messages_room_id on chat_messages(room_id);
create index idx_chat_messages_created_at on chat_messages(created_at);
