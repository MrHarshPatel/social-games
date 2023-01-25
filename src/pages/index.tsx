import React, { useState } from 'react';
import axios from 'axios';
import Router from 'next/router';

const IndexPage = () => {
  const [lobbyId, setLobbyId] = useState('');

  const createLobby = async () => {
    try {
      const { data } = await axios.post('/api/lobbies');
      console.log(data)
      setLobbyId(data.lobby.url);
      Router.push(`/lobby/${data.lobby.url}`);
    } catch (error) {
      console.error(error);
    }
  };

  const joinLobby = () => {
    if (lobbyId) {
      Router.push(`/lobby/${lobbyId}`);
    } else {
      alert('Please enter a valid lobby ID');
    }
  };

  return (
    <div>
      <h1>Welcome to the Game</h1>
      <button onClick={createLobby}>Create a lobby</button>
      <br />
      <br />
      <label htmlFor="lobbyId">Join a lobby:</label>
      <input
        type="text"
        id="lobbyId"
        value={lobbyId}
        onChange={(e) => setLobbyId(e.target.value)}
      />
      <button onClick={joinLobby}>Join</button>
    </div>
  );
};

export default IndexPage;
