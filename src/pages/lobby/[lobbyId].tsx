import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import ErrorPage from '../404';
import io from 'socket.io-client';
import Cookies from 'js-cookie';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
  button: {
    margin: theme.spacing(1),
  },
  boldText: {
    fontWeight: 'bold',
  },
}));

const socket = io('http://localhost:3001');

export default function LobbyPage() {
  const classes = useStyles();
  const router = useRouter();
  const { lobbyId } = router.query;
  const [users, setUsers] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [currentUser, setCurrentUser] = useState(undefined);

  socket.on('update-lobby', (data) => {
    console.log("Got an update lobby request.");
    console.log(data.lobby.users);
    setUsers(data.lobby.users);
  });

  useEffect(() => {
    if (!router.isReady) return;
    const { lobbyId } = router.query;
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`/api/lobbies/${lobbyId}`, {
          withCredentials: true
        });

        console.log(data);
        if (data.addedUser) {
          console.log("NEW user joined!");
          socket.emit('join-lobby', lobbyId);
          setCurrentUser(data.addedUser);
        }

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

  const handleLeaveLobby = async () => {
    try {
      const username = Cookies.getJSON(`${lobbyId}/user`);
      console.log(username);
      socket.emit('leave-lobby', lobbyId, username);
      const { data } = await axios.get(`/api/lobbies/${lobbyId}/user/leave`, {
        withCredentials: true
      });
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Users in lobby: {lobbyId}
      </Typography>
      <List className={classes.root}>
        {users.length >
          0 ? (
          users.map((user) => (
            <ListItem key={user.username}>
              <ListItemText primary={user.username} primaryTypographyProps={user.username === currentUser ? {className: classes.boldText} : null} />
            </ListItem>
          ))
        ) : (
          <Typography variant="body1" gutterBottom>
            No users in this lobby
          </Typography>
        )}
      </List>
      <Button
        variant="contained"
        color="secondary"
        className={classes.button}
        onClick={handleLeaveLobby}
      >
        Leave Lobby
      </Button>
    </div>
  );
}