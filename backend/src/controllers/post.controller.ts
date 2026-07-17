import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { createPost, deletePost, listPosts, publishPost, updatePost } from '../services/post.service.js'
import { postPayloadSchema, postQuerySchema } from '../validators/post.validator.js'

const getParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value

export const getPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = postQuerySchema.parse(req.query)
    const posts = await listPosts(req.user?.id ?? '', query)
    res.status(200).json({ posts })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid query' })
    }

    next(error)
  }
}

export const createPostHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = postPayloadSchema.parse(req.body)
    const post = await createPost(req.user?.id ?? '', parsed)
    res.status(201).json({ post })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid post' })
    }

    next(error)
  }
}

export const updatePostHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = postPayloadSchema.parse(req.body)
    const postId = getParam(req.params.id)

    if (!postId) {
      return res.status(400).json({ message: 'Post id is required' })
    }

    const post = await updatePost(req.user?.id ?? '', postId, parsed)
    res.status(200).json({ post })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid post' })
    }

    next(error)
  }
}

export const deletePostHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const postId = getParam(req.params.id)

    if (!postId) {
      return res.status(400).json({ message: 'Post id is required' })
    }

    await deletePost(req.user?.id ?? '', postId)
    res.status(200).json({ message: 'Post deleted' })
  } catch (error) {
    next(error)
  }
}

export const publishPostHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const postId = getParam(req.params.id)

    if (!postId) {
      return res.status(400).json({ message: 'Post id is required' })
    }

    const result = await publishPost(req.user?.id ?? '', postId)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
