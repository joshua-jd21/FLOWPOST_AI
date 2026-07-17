import { Router } from 'express'
import { createPostHandler, deletePostHandler, getPosts, publishPostHandler, updatePostHandler } from '../controllers/post.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', protect, getPosts)
router.post('/', protect, createPostHandler)
router.post('/:id/publish', protect, publishPostHandler)
router.put('/:id', protect, updatePostHandler)
router.delete('/:id', protect, deletePostHandler)

export default router
