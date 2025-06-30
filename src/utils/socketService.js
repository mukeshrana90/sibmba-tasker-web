// socketService.js
import { io } from 'socket.io-client';

let socketInstance = null;

function connect(url, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = io(url, options);

    socket.on('connect', () => {
      socketInstance = socket;
      resolve(socket); // Return socket if needed
    });

    socket.on('connect_error', (error) => {
      reject(error);
    });
  });
}

function disconnect() {
  return new Promise((resolve, reject) => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      resolve();
    } else {
      reject(new Error('Socket is not connected.'));
    }
  });
}

function listen(event, callback) {
  if (socketInstance) {
    socketInstance.on(event, callback);
  } else {
    console.warn('Socket is not connected.');
  }
}

function off(event) {
  if (socketInstance) {
    socketInstance.off(event);
  }
}

function emit(event, data) {
  if (socketInstance) {
    socketInstance.emit(event, data);
  } else {
    console.warn('Socket is not connected.');
  }
}

function getSocket() {
  return socketInstance;
}

export {
  connect,
  disconnect,
  listen,
  off,
  emit,
  getSocket
};
