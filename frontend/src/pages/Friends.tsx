import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckIcon,
  EmptyState,
  ErrorAlert,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "../components/ui";
import {
  acceptFriendRequest,
  getFriends,
  getIncomingRequests,
  getMyProfile,
  getOutgoingRequests,
  rejectFriendRequest,
  removeFriend,
  searchFriends,
  sendFriendRequest,
  updatePrivacy,
} from "../features/friends/api";
import type {
  FriendRequest,
  FriendSearchResult,
  Friendship,
  UserProfile,
} from "../features/friends/types";

export function Friends() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [f, incoming, outgoing, p] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
        getMyProfile(),
      ]);
      setFriends(f);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadData();
  }, []);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    setError("");
    try {
      const results = await searchFriends(searchQuery);
      setSearchResults(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na pesquisa");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    setError("");
    try {
      await sendFriendRequest(username);
      setSearchResults([]);
      setSearchQuery("");
      const outgoing = await getOutgoingRequests();
      setOutgoingRequests(outgoing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar pedido");
    }
  };

  const handleAccept = async (requestId: string) => {
    setError("");
    try {
      await acceptFriendRequest(requestId);
      const [f, incoming, outgoing] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
      ]);
      setFriends(f);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao aceitar pedido");
    }
  };

  const handleReject = async (requestId: string) => {
    setError("");
    try {
      await rejectFriendRequest(requestId);
      const incoming = await getIncomingRequests();
      setIncomingRequests(incoming);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao rejeitar pedido");
    }
  };

  const handleRemove = async (friendId: string) => {
    setError("");
    try {
      await removeFriend(friendId);
      const f = await getFriends();
      setFriends(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover amigo");
    }
  };

  const handlePrivacyToggle = async (value: boolean) => {
    setError("");
    try {
      await updatePrivacy(value);
      const p = await getMyProfile();
      setProfile(p);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao atualizar privacidade",
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Amigos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {friends.length} {friends.length !== 1 ? "amigos" : "amigo"}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed btn-press"
          title="Atualizar"
        >
          <RefreshIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Privacy */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Privacidade
          </h2>
        </div>
        <div className="flex items-center justify-between bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <span className="text-white text-sm">
            Mostrar as minhas reservas aos amigos
          </span>
          <button
            onClick={() =>
              handlePrivacyToggle(!(profile?.showBookingsToFriends ?? false))
            }
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              profile?.showBookingsToFriends ? "bg-violet-600" : "bg-slate-600"
            }`}
            role="switch"
            aria-checked={profile?.showBookingsToFriends ?? false}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                profile?.showBookingsToFriends
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Search */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Adicionar amigo
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Pesquisar por username..."
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || searchQuery.length < 2}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-xl transition-all duration-200 btn-press"
          >
            {searching ? "..." : "Pesquisar"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-700/50"
              >
                <div>
                  <p className="text-white text-sm font-semibold">
                    {user.displayName}
                  </p>
                  <p className="text-slate-500 text-xs">@{user.username}</p>
                </div>
                <button
                  onClick={() => handleSendRequest(user.username)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all duration-200 btn-press"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
              Pedidos pendentes
            </h2>
          </div>
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-700/50"
              >
                <div>
                  <p className="text-white text-sm font-semibold">
                    @{req.sender?.username}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all duration-200 btn-press"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-all duration-200 btn-press"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <RefreshIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
              Pedidos enviados
            </h2>
          </div>
          <div className="space-y-2">
            {outgoingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-700/50"
              >
                <div>
                  <p className="text-white text-sm font-semibold">
                    @{req.receiver?.username}
                  </p>
                </div>
                <span className="text-slate-500 text-xs">Pendente</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends List */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-slate-500" />
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
            Os teus amigos
          </h2>
        </div>

        {friends.length === 0 && !loading ? (
          <EmptyState
            icon={<UsersIcon className="w-8 h-8" />}
            title="Ainda sem amigos"
            description="Pesquisa por username para começar a adicionar amigos."
          />
        ) : (
          <div className="space-y-2">
            {friends.map((friendship) => (
              <div
                key={friendship.id}
                className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-700/50"
              >
                <div>
                  <p className="text-white text-sm font-semibold">
                    {friendship.friend.user.name}
                  </p>
                  <p className="text-slate-500 text-xs">
                    @{friendship.friend.username}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/friends/${friendship.friendId}`}
                    state={{
                      displayName: friendship.friend.user.name,
                      username: friendship.friend.username,
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all duration-200 btn-press"
                  >
                    Ver reservas
                  </Link>
                  <button
                    onClick={() => handleRemove(friendship.friendId)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    title="Remover amigo"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
