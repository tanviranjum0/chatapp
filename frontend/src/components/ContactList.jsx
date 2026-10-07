import { useEffect, useRef, useState } from "react";
import { LoaderIcon, SearchIcon, UserSearchIcon, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UserRow from "./UserRow";

const DEBOUNCE_MS = 280;

// People are found by searching a name or an email address; the user list is never dumped on screen.
function ContactList() {
  const searchQuery = useChatStore((s) => s.searchQuery);
  const searchResults = useChatStore((s) => s.searchResults);
  const isSearching = useChatStore((s) => s.isSearching);
  const searchContacts = useChatStore((s) => s.searchContacts);
  const clearSearch = useChatStore((s) => s.clearSearch);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const selectedId = useChatStore((s) => s.selectedUser?._id);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  const [text, setText] = useState(searchQuery);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => clearTimeout(timer.current);
  }, []);

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => searchContacts(value), DEBOUNCE_MS);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setText("");
    clearSearch();
    inputRef.current?.focus();
  };

  const q = text.trim();
  const tooShort = q.length < 2;
  const settled = !isSearching && searchQuery.trim() === q;

  return (
    <div>
      <div className="relative px-1 pb-3 pt-1">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-[calc(50%+2px)] text-slate-500" />
        <input
          ref={inputRef}
          type="search"
          value={text}
          onChange={onChange}
          maxLength={100}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Search by name or email"
          aria-label="Search people by name or email"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-10 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 hover:border-white/20 focus:border-brand-500/70 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute right-4 top-1/2 flex -translate-y-[calc(50%+2px)] items-center">
          {isSearching ? (
            <LoaderIcon className="size-4 animate-spin text-slate-400" aria-label="Searching" />
          ) : (
            text && (
              <button onClick={clear} aria-label="Clear search" className="rounded-full p-0.5 text-slate-400 hover:text-white">
                <XIcon className="size-4" />
              </button>
            )
          )}
        </div>
      </div>

      {tooShort ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-bloom-500/15">
            <UserSearchIcon className="size-7 text-brand-400" />
          </span>
          <div>
            <h4 className="font-semibold text-slate-100">Find someone to chat with</h4>
            <p className="mt-1 text-sm text-slate-400">
              Type at least 2 letters of their name, or the start of their email address.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1" aria-label="Search results" aria-live="polite">
          {searchResults.map((u) => (
            <li key={u._id}>
              <UserRow
                user={u}
                variant="search"
                online={onlineUsers.includes(u._id)}
                selected={selectedId === u._id}
                onSelect={setSelectedUser}
              />
            </li>
          ))}
          {settled && searchResults.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-slate-400">
              <p className="font-semibold text-slate-200">No one found for “{q}”</p>
              <p className="mt-1">Check the spelling, or try their full email address.</p>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
export default ContactList;
