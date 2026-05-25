import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Search, Check, X, MessageSquare, Trophy, Flame, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Friend, Profile } from '../types';

export default function FriendsPage() {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<(Friend & { friend_profile?: Profile })[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');

  const fetchFriends = useCallback(async () => {
    if (!profile) return;

    const { data: friendsData, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:profiles!friends_friend_id_fkey (*)
      `)
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    if (!error && friendsData) {
      setFriends(friendsData as (Friend & { friend_profile?: Profile })[]);
    }

    // Fetch pending requests
    const { data: pendingData } = await supabase
      .from('friends')
      .select('*')
      .eq('friend_id', profile.id)
      .eq('status', 'pending');

    if (pendingData) setPendingRequests(pendingData);

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const searchUsers = async () => {
    if (!profile || !searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .neq('id', profile.id)
      .limit(10);
    if (data) setSearchResults(data as Profile[]);
    setSearching(false);
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!profile) return;
    await supabase.from('friends').insert({
      user_id: profile.id,
      friend_id: friendId,
      status: 'pending',
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const acceptRequest = async (request: Friend) => {
    if (!profile) return;
    await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', request.id);

    // Also create reverse relationship
    await supabase.from('friends').insert({
      user_id: profile.id,
      friend_id: request.user_id,
      status: 'accepted',
    });

    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    fetchFriends();
  };

  const declineRequest = async (request: Friend) => {
    await supabase.from('friends').delete().eq('id', request.id);
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
  };

  const onlineFriends = friends.filter((f) => {
    const lastSession = f.friend_profile?.last_session_at;
    if (!lastSession) return false;
    const hourAgo = new Date(Date.now() - 3600000);
    return new Date(lastSession) > hourAgo;
  });

  return (
    <div className="min-h-screen bg-[#090e1a] pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-black mb-2 flex items-center gap-3">
            <Users size={28} className="text-cyan-400" />
            Friends
          </h1>
          <p className="text-white/50">{friends.length} friends • {onlineFriends.length} online</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          {(['friends', 'requests', 'add'] as const).map((tab) => {
            const labels = { friends: 'Friends', requests: 'Requests', add: 'Add Friend' };
            const badges = { friends: null, requests: pendingRequests.length || null, add: null };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab ? 'bg-white/10 text-white' : 'text-white/50'
                }`}
              >
                {labels[tab]}
                {badges[tab] && (
                  <span className="px-1.5 py-0.5 bg-blue-500 rounded-full text-xs">
                    {badges[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Friends list */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
              ))
            ) : friends.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Users size={40} className="mx-auto mb-3 opacity-50" />
                <p>No friends yet. Add some friends to compare progress!</p>
              </div>
            ) : (
              friends.map((friend, i) => {
                const fp = friend.friend_profile;
                const isOnline = fp?.last_session_at && new Date(fp.last_session_at) > new Date(Date.now() - 3600000);
                return (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-lg font-bold">
                        {fp?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#090e1a] rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{fp?.display_name || 'Unknown'}</div>
                      <div className="text-sm text-white/50">
                        Level {fp?.level || 1} • {fp?.xp || 0} XP
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-lg">
                        <Flame size={14} className="text-amber-400" />
                        <span className="text-xs text-amber-400">{fp?.streak || 0}</span>
                      </div>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <MessageSquare size={18} className="text-white/40" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <UserPlus size={40} className="mx-auto mb-3 opacity-50" />
                <p>No pending friend requests</p>
              </div>
            ) : (
              pendingRequests.map((request, i) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-lg font-bold">
                    ?
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Wants to be friends</div>
                    <div className="text-sm text-white/50">{new Date(request.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(request)}
                      className="p-2 bg-emerald-500/20 rounded-lg hover:bg-emerald-500/30"
                    >
                      <Check size={18} className="text-emerald-400" />
                    </button>
                    <button
                      onClick={() => declineRequest(request)}
                      className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30"
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Add friend */}
        {activeTab === 'add' && (
          <div>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Search by name or username..."
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={searchUsers}
                disabled={searching}
                className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </motion.button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg font-bold">
                      {user.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{user.display_name}</div>
                      <div className="text-sm text-white/50">@{user.username}</div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-cyan-500/30"
                    >
                      <UserPlus size={16} />
                      Add
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <div className="text-center py-8 text-white/40">
                No users found matching "{searchQuery}"
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
