import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { useSocket } from '../hooks/useSocket';

type ModalType = 'create' | 'join' | null;

export function Home() {
  const navigate = useNavigate();
  const { createLobby, joinLobby, isConnected, isConnecting, error, lobbyCode } = useSocket();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [username, setUsername] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inputError, setInputError] = useState('');

  // Navigate to lobby when we get a lobby code
  if (lobbyCode) {
    navigate('/lobby');
  }

  const handleCreateLobby = () => {
    if (!username.trim()) {
      setInputError('Please enter a username');
      return;
    }
    if (username.length > 15) {
      setInputError('Username must be 15 characters or less');
      return;
    }
    setInputError('');
    createLobby(username.trim());
  };

  const handleJoinLobby = () => {
    if (!username.trim()) {
      setInputError('Please enter a username');
      return;
    }
    if (username.length > 15) {
      setInputError('Username must be 15 characters or less');
      return;
    }
    if (!joinCode.trim() || joinCode.length !== 6) {
      setInputError('Please enter a valid 6-character lobby code');
      return;
    }
    setInputError('');
    joinLobby(joinCode.trim(), username.trim());
  };

  const closeModal = () => {
    setModalType(null);
    setUsername('');
    setJoinCode('');
    setInputError('');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent mb-4">
          Rizz Royale
        </h1>
        <p className="text-gray-400 text-lg">
          Compete to win the heart of the bar
        </p>
      </div>

      {/* Connection status */}
      {isConnecting && (
        <p className="text-gray-500 mb-4">Connecting to server...</p>
      )}
      {!isConnected && !isConnecting && (
        <p className="text-red-500 mb-4">Not connected to server</p>
      )}

      {/* Main buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          size="lg"
          onClick={() => setModalType('create')}
          disabled={!isConnected}
          className="w-full"
        >
          Create Lobby
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setModalType('join')}
          disabled={!isConnected}
          className="w-full"
        >
          Join Lobby
        </Button>
      </div>

      {/* Error from socket */}
      {error && (
        <p className="mt-4 text-red-500 text-center">{error}</p>
      )}

      {/* Create Lobby Modal */}
      <Modal
        isOpen={modalType === 'create'}
        onClose={closeModal}
        title="Create Lobby"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateLobby();
          }}
        >
          <Input
            label="Your Name"
            name="username"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={inputError}
            autoFocus
            maxLength={15}
          />
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Start
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Lobby Modal */}
      <Modal
        isOpen={modalType === 'join'}
        onClose={closeModal}
        title="Join Lobby"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinLobby();
          }}
        >
          <div className="space-y-4">
            <Input
              label="Lobby Code"
              name="code"
              placeholder="Enter 6-character code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
              className="text-center text-2xl tracking-widest uppercase"
            />
            <Input
              label="Your Name"
              name="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={inputError}
              maxLength={15}
            />
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Join
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
