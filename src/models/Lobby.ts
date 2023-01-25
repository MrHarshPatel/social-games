import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ILobby extends Document {
  url: string;
  users: Array<string>;
}

const lobbySchema: Schema = new Schema({
  url: { type: String, required: true, unique: true },
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export const Lobby: Model<ILobby> = mongoose.model<ILobby>('Lobby', lobbySchema);