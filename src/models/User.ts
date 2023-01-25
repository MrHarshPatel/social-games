import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  lobby: string;
}

const userSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  lobby: { type: Schema.Types.ObjectId, ref: 'Lobby' },
});

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);