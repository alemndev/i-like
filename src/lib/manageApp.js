import User from '../database/models/User.models'
import Mod from '../database/models/Mod.model'
import Topic from '../database/models/Topic.model'
import Space from '../database/models/Space.models'
import Post from '../database/models/Post.model'
import {
  filterSanctionData,
  filterSanctionsData,
  filterSpaceData,
  filterSpacesData,
  filterTopicData,
  filterTopicsData,
  filterUserData,
  filterUsersData,
  filterPostData,
  filterPostsData,
} from './filterData'

export const USER_ROLES = {
  admin: 'admin',
  mod: 'mod',
  support: 'support',
  user: 'user',
}
export const MOD_TYPES = {
  sanction: 'sanction',
  support: 'support',
  report: 'report',
}
export const MOD_SANCTION_TYPES = { muted: 'muted', banned: 'banned' }
export const MOD_STATUS = {
  pending: 'pending',
  opened: 'opened',
  closed: 'closed',
}

export async function getUser(user_id, role) {
  return filterUserData(await User.findById(user_id), role)
}

export async function getUsers() {
  return filterUsersData(await User.find({}))
}

export async function updateUser(user_id, data) {
  return User.findByIdAndUpdate(user_id, {
    username: data.username,
    display_name: data.display_name,
  })
}

export async function deleteUser(user_id) {
  // Delete sanctions
  const getUserSanctions = (await Mod.find({ user: user_id })).filter((sanction) => sanction.type === 'sanction')

  getUserSanctions.forEach(async (sanction) => {
    await Mod.findOneAndDelete(sanction._id)
  })

  // Delete user
  return User.findByIdAndDelete(user_id)
}

export async function getSanctionByUser(sanction_id, obj) {
  return await filterSanctionData(await Mod.findById(sanction_id), obj)
}

export async function getSanctions(obj) {
  const sanctions = (await Mod.find({})).filter((sanction) => sanction.type === 'sanction')

  return await filterSanctionsData(sanctions, obj)
}

export async function getSanctionsByUser(user_id, obj) {
  const sanction = (await Mod.find({}))
    .filter((data) => data.type === 'sanction')
    .filter((data) => data.user.includes(user_id))

  return await filterSanctionsData(sanction, obj)
}

export async function removeSanction(sanction_id) {
  return await Mod.findByIdAndUpdate(sanction_id, {
    status: MOD_STATUS['closed'],
  })
}

export async function getTopics(obj) {
  const topics = await Topic.find({})

  return await filterTopicsData(topics, obj)
}

export async function getTopic(topic_id, obj) {
  const topic = await Topic.findById(topic_id)

  return await filterTopicData(topic, obj)
}

export async function updateTopic(topic_id, data) {
  return Topic.findByIdAndUpdate(topic_id, {
    name: data.name,
    description: data.description,
    banner: data.banner,
  })
}

export async function deleteTopic(topic_id) {
  const topic = await Topic.findById(topic_id)

  topic.spaces.forEach(async (spaceId) => {
    Space.findByIdAndDelete(spaceId)
  })

  return topic.deleteOne()
}

export async function getSpaces({ obj, managerId }) {
  if (managerId) {
    const spaces = await Space.find({ manager: managerId })

    return await filterSpacesData(spaces, obj)
  }
  const spaces = await Space.find({})

  return await filterSpacesData(spaces, obj)
}

export async function getSpace(space_id, obj) {
  const space = await Space.findById(space_id)

  return await filterSpaceData(space, obj)
}

export async function updateSpace(space_id, data) {
  return Space.findByIdAndUpdate(space_id, {
    name: data.name,
    description: data.description,
    banner: data.banner,
  })
}

export async function deleteSpace(space_id) {
  const space = await Space.findById(space_id)
  const topic = await Topic.findById(space.topicId)

  topic.spaces.splice(topic.spaces.indexOf(space._id), 1)
  topic.save()

  return space.deleteOne()
}

export async function getPosts({ obj, spaceId, authorId }) {
  if (spaceId) {
    const posts = await Post.find({ spaceId })

    return await filterPostsData(posts, obj)
  }
  if (authorId) {
    const posts = await Post.find({ author: authorId })

    return await filterPostsData(posts, obj)
  }

  const posts = await Post.find({})

  return await filterPostsData(posts, obj)
}

export async function getPost(post_id, obj) {
  const post = await Post.findById(post_id)

  return await filterPostData(post, obj)
}

export async function updatePost(post_id, data) {
  const post = await Post.findById(post_id)

  post.title = data.title
  post.content = data.content
  post.banner = data.banner

  if (data.tags.length > 0) {
    post.tags = data.tags
  } else {
    post.tags = []
  }

  post.save()
}

export async function deletePost(post_id) {
  const post = await Post.findById(post_id)
  const space = await Space.findById(post.spaceId)

  space.posts.splice(space.posts.indexOf(post_id), 1)
  space.save()

  return post.deleteOne()
}
