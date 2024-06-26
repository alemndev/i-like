import { Router } from 'express'
import {
  MOD_SANCTION_TYPES,
  MOD_STATUS,
  MOD_TYPES,
  deletePost,
  deleteSpace,
  deleteTopic,
  deleteUser,
  getPost,
  getPosts,
  getSanctionByUser,
  getSanctions,
  getSanctionsByUser,
  getSpace,
  getSpaces,
  getTopic,
  getTopics,
  getUser,
  getUsers,
  removeSanction,
  updatePost,
  updateSpace,
  updateTopic,
  updateUser,
} from '../lib/manageApp'
import Mod from '../database/models/Mod.model'
import Topic from '../database/models/Topic.model'
import { isValidObjectId } from 'mongoose'
import { isValidUrl } from '../lib/validate'
import { ms } from '../lib/ms'
import { parserTags } from '../lib/parser'
const router = Router()

/* HOME */
router.get('/', async (req, res) => {
  try {
    if (req.user.roles.includes('admin'))
      return res.render('manage/home', {
        users: await getUsers(),
        sanctions: await getSanctions({}),
        topics: await getTopics({}),
        spaces: await getSpaces({ obj: {} }),
        posts: await getPosts({ obj: {} }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/users', async (req, res) => {
  try {
    if (req.user.roles.includes('admin'))
      return res.render('manage/users', { users: await getUsers() })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/sanctions', async (req, res) => {
  try {
    if (req.user.roles.includes('admin'))
      return res.render('manage/sanctions', {
        sanctions: await getSanctions({
          include_mod: true,
          include_user: true,
        }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/topics', async (req, res) => {
  try {
    if (req.user.roles.includes('admin'))
      return res.render('manage/topics', {
        topics: await getTopics({ include_spaces: true }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/spaces', async (req, res) => {
  try {
    if (req.user.roles.includes('admin'))
      return res.render('manage/spaces', {
        spaces: await getSpaces({ obj: { include_manager: true, include_topic: true } }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/posts', async (req, res) => {
  try {
    if (req.user.roles.includes('admin'))
      return res.render('manage/posts', {
        posts: await getPosts({ obj: { include_author: true, include_space: true } }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

/* SANCTIONS */
router.get('/sanctions/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    if (!isValidObjectId(userId)) throw Error('invalid_user_id')

    if (req.user.roles.includes('admin'))
      return res.render('manage/sanctions/user', {
        user: await getUser(userId, 'mod'),
        sanctions: await getSanctionsByUser(userId, { include_mod: true }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/sanctions/new/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    if (!isValidObjectId(userId)) throw Error('invalid_user_id')

    if (req.user.roles.includes('admin'))
      return res.render('manage/sanctions/new', {
        moderator: req.user,
        user: await getUser(userId, 'mod'),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/sanctions/new/:userId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin') || req.user.roles.includes('mod')) {
      const { userId } = req.params
      const { subject, content, sanction_type, sanction_time } = req.body
      const sanctionTimeParsed = ms(sanction_time)
      if (!isValidObjectId(userId)) throw Error('invalid_user_id')
      if (!subject) throw Error('subject_missing')
      if (!content) throw Error('content_missing')
      if (!sanction_type) throw Error('sanction_type_missing')
      if (!sanction_time) throw Error('sanction_time_missing')
      if (sanctionTimeParsed.err) throw Error('sanction_time_invalid')
      if (!Object.keys(MOD_SANCTION_TYPES).includes(sanction_type))
        throw Error('sanction_type_not_valid')

      const newSanction = new Mod({
        type: MOD_TYPES['sanction'],
        moderators: [req.user.id],
        user: userId,
        subject,
        content,
        status: MOD_STATUS['pending'],
        sanction_type,
        sanction_time: sanctionTimeParsed.time,
      })

      await newSanction.save()

      res.status(201).json({ userId })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/sanctions/details/:sanctionId', async (req, res) => {
  try {
    const { sanctionId } = req.params
    if (!isValidObjectId(sanctionId)) throw Error('invalid_sanction_id')

    if (req.user.roles.includes('admin'))
      return res.render('manage/sanctions/details', {
        sanction: await getSanctionByUser(sanctionId, {
          include_user: true,
          include_mod: true,
        }),
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.get('/sanctions/remove/:sanctionId', async (req, res) => {
  try {
    const { sanctionId } = req.params
    const { userId } = req.query
    if (!isValidObjectId(sanctionId)) throw Error('invalid_sanction_id')
    if (!isValidObjectId(userId)) throw Error('invalid_user_id')

    if (req.user.roles.includes('admin')) {
      await removeSanction(sanctionId)
      return res.redirect(`/manage/sanctions/${userId}`)
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

/** USERS **/
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    if (!isValidObjectId(userId)) throw Error('invalid_user_id')

    if (req.user.roles.includes('admin'))
      return res.render('manage/users/user', {
        user: await getUser(userId, 'mod'),
        perms_to_delete_users: req.user.roles.includes('admin') ? true : false,
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/users/edit/:userId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { userId } = req.params
      const { username, display_name } = req.body
      if (!isValidObjectId(userId)) throw Error('invalid_user_id')
      if (username.length < 3) throw Error('username_too_short')
      if (username.length > 28) throw Error('username_too_long')
      if (username.length > 50) throw Error('display_name_too_long')
      if (display_name.length < 1) throw Error('display_name_too_short')

      await updateUser(userId, { username, display_name })
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/users/delete/:userId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { userId } = req.params
      if (!isValidObjectId(userId)) throw Error('invalid_user_id')

      await deleteUser(userId)
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

/** TOPICS **/
router.get('/topics/new', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) return res.render('manage/topics/new', { user: req.user })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/topics/new', async (req, res) => {
  try {
    if (req.user.roles.includes('admin') || req.user.roles.includes('mod')) {
      const { name, description, banner } = req.body
      if (!name) throw Error('name_missing')
      if (name.length < 3) throw Error('name_to_short')
      if (name.length > 50) throw Error('name_too_long')
      if (!description) throw Error('description_missing')
      if (description.length < 10) throw Error('description_to_short')
      if (description.length > 100) throw Error('description_to_short')
      if (banner & !isValidUrl(banner)) throw Error('banner_invalid')

      const getTopic = await Topic.findOne({ name: name })
      if (getTopic) throw Error('already_created_topic')

      const newTopic = new Topic({
        name,
        description,
        banner,
      })

      await newTopic.save()

      res.status(201).json({ ok: true })
    }
  } catch (err) {
    console.log(err)
    res.status(404).json({ err: err.message })
  }
})

router.get('/topics/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params
    if (!isValidObjectId(topicId)) throw Error('invalid_topic_id')

    if (req.user.roles.includes('admin'))
      return res.render('manage/topics/topic', {
        topic: await getTopic(topicId, { include_spaces: true }),
        perms_to_delete_topics: req.user.roles.includes('admin') ? true : false,
      })
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/topics/edit/:topicId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { topicId } = req.params
      const { name, description, banner } = req.body
      if (!isValidObjectId(topicId)) throw Error('invalid_topic_id')
      if (name.length < 3) throw Error('name_too_short')
      if (name.length > 50) throw Error('name_too_long')
      if (description.length < 10) throw Error('description_too_short')
      if (description.length > 100) throw Error('description_too_long')
      if (!isValidUrl(banner)) throw Error('banner_invalid')

      await updateTopic(topicId, { name, description, banner })
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/topics/delete/:topicId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { topicId } = req.params
      if (!isValidObjectId(topicId)) throw Error('invalid_topic_id')

      await deleteTopic(topicId)
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

/** SPACES **/
router.get('/spaces/:spaceId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { spaceId } = req.params
      if (!isValidObjectId(spaceId)) throw Error('invalid_space_id')

      res.render('manage/spaces/space', {
        space: await getSpace(spaceId, {
          include_manager: true,
        }),
        perms_to_delete_spaces: req.user.roles.includes('admin') ? true : false,
      })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/spaces/edit/:spaceId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { spaceId } = req.params
      const { name, description, banner } = req.body
      if (!isValidObjectId(spaceId)) throw Error('invalid_space_id')
      if (name.length < 3) throw Error('name_too_short')
      if (name.length > 50) throw Error('name_too_long')
      if (description.length < 10) throw Error('description_too_short')
      if (description.length > 100) throw Error('description_too_long')
      if (!isValidUrl(banner)) throw Error('banner_invalid')

      await updateSpace(spaceId, { name, description, banner })
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/spaces/delete/:spaceId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { spaceId } = req.params
      if (!isValidObjectId(spaceId)) throw Error('invalid_space_id')

      await deleteSpace(spaceId)
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

/** POSTS **/
router.get('/posts/:postId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { postId } = req.params
      if (!isValidObjectId(postId)) throw Error('invalid_post_id')

      res.render('manage/posts/post', {
        post: await getPost(postId, {
          include_author: true,
          include_space: true,
        }),
        perms_to_delete_posts: req.user.roles.includes('admin') ? true : false,
      })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/posts/edit/:postId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { postId } = req.params
      const { title, content, tags, banner } = req.body
      if (!isValidObjectId(postId)) throw Error('invalid_post_id')
      if (title.length < 3) throw Error('title_too_short')
      if (title.length > 50) throw Error('title_too_long')
      if (content.length < 30) throw Error('content_too_short')
      if (content.length > 4000) throw Error('content_too_long')
      if (!isValidUrl(banner)) throw Error('banner_invalid')

      const tagsParsed = parserTags(tags)
      if (tagsParsed.length > 25) throw Error('max_tags')

      await updatePost(postId, {
        title,
        content,
        tags: tagsParsed,
        banner,
      })
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

router.post('/posts/delete/:postId', async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const { postId } = req.params
      if (!isValidObjectId(postId)) throw Error('invalid_post_id')

      await deletePost(postId)
      res.status(200).json({ ok: true })
    }
  } catch (err) {
    res.status(404).json({ err: err.message })
  }
})

export default router
