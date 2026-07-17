import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { memoryUsers } from '../config/db.js'
import { User } from '../models/user.model.js'
import { AppError } from '../utils/errors.js'
import { env } from '../utils/env.js'

const isMongoAvailable = () => mongoose.connection.readyState === 1

const getUserRecord = async (email: string) => {
  if (!isMongoAvailable()) {
    return memoryUsers.find((entry) => entry.email === email) ?? null
  }

  const user = await User.findOne({ email })
  return user ? { ...user.toObject(), id: user._id.toString() } : null
}

const createUserRecord = async (input: { name: string; email: string; password: string }) => {
  if (!isMongoAvailable()) {
    const hashedPassword = await bcrypt.hash(input.password, 10)
    const user = {
      id: `${memoryUsers.length + 1}`,
      name: input.name,
      email: input.email,
      password: hashedPassword,
      avatar: '',
      isActive: true,
    }
    memoryUsers.push(user)
    return user
  }

  const hashedPassword = await bcrypt.hash(input.password, 10)
  const user = await User.create({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  })

  return { ...user.toObject(), id: user._id.toString() }
}

export const registerUser = async (input: { name: string; email: string; password: string }) => {
  const existingUser = await getUserRecord(input.email)

  if (existingUser) {
    throw new AppError('User already exists', 409)
  }

  const user = await createUserRecord(input)

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: '7d',
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isActive: user.isActive,
    },
    token,
  }
}

export const loginUser = async (input: { email: string; password: string }) => {
  const user = await getUserRecord(input.email)

  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const isValidPassword = await bcrypt.compare(input.password, user.password)

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401)
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: '7d',
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isActive: user.isActive,
    },
    token,
  }
}
