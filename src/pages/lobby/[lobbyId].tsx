import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import ErrorPage from '../404';

export default function LobbyPage() {
  const router = useRouter();
  const { lobbyId } = router.query;
  const [users, setUsers] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if(!router.isReady) return;
    const { lobbyId } = router.query;
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`/api/lobbies/${lobbyId}`, {
          withCredentials: true
          });
        setUsers(data.lobby.users);
        setNotFound(false);
      } catch (error) {
        if (error.response.status === 404) {
          setNotFound(true);
        }
      }
    };
    fetchUsers();
  }, [lobbyId]);

  if (notFound) {
    return <ErrorPage />;
  }

  return (
    <div>
      <h1>Users in lobby: {lobbyId}</h1>
      {users.length > 0 ? (
        <ul>
          {users.map((user) => (
            <li key={user.username}>{user.username}</li>
          ))}
          </ul>
      ) : (
        <p>No users in this lobby</p>
      )}
    </div>
  );
}
