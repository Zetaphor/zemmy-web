import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiStore } from '@/stores/api/api'
import { DateTime } from 'luxon'

export const useCommentsStore = defineStore('comments', () => {
  const api = useApiStore()

  const sort = ref('Hot')
  const view = ref('All')

  async function getComments(post_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await api.getComments(post_id, sort.value, view.value)
        const comments = generateFlatCommentArray(resp.comments)
        resolve(comments)
      } catch (error) {
        console.log(error)
        reject(error)
      }
    })
  }

  function generateFlatCommentArray(comments) {
    let map = new Map()
    comments.forEach((item) => {
      let my_vote = null
      if (api.authenticated) {
        if (typeof item.my_vote !== 'undefined') {
          my_vote = item.my_vote
        }
      }

      const parsedItem = {
        children: [],
        comment: {
          id: item.comment.id,
          content: item.comment.content,
          creator_id: item.comment.creator_id,
          distinguished: item.comment.distinguished,
          local: item.comment.local,
          ap_id: item.comment.ap_id,
          published: formatRelativeTime(item.comment.published),
          path: item.comment.path,
          saved: item.saved
        },
        counts: {
          child_count: item.counts.child_count || 0,
          downvotes: item.counts.downvotes,
          upvotes: item.counts.upvotes,
          score: item.counts.score,
          my_vote: my_vote
        },
        creator: {
          actor_id: item.creator.actor_id,
          actor_domain: (item.creator.actor_id.match(/https:\/\/([^/]+)\/u\//) || [])[1],
          admin: item.creator.admin,
          avatar: item.creator.avatar || '',
          bot_account: item.creator.bot_account,
          id: item.creator.id,
          local: item.creator.local,
          name: item.creator.name
        }
      }

      map.set(parsedItem.comment.id, { ...parsedItem, children: [] })
    })

    let root = { id: '0', children: [] }

    map.forEach((item) => {
      let pathArr = item.comment.path.split('.')
      let parentPathId = pathArr[pathArr.length - 2]

      if (parentPathId === '0') {
        root.children.push(item)
      } else if (map.has(parseInt(parentPathId))) {
        map.get(parseInt(parentPathId)).children.push(item)
      }
    })

    let flatArray = []

    function flattenChildren(commentArray, depth = 0) {
      commentArray.forEach((comment) => {
        let { children, ...commentWithoutChildren } = comment
        flatArray.push({ ...commentWithoutChildren, depth })
        if (children.length > 0) {
          flattenChildren(children, depth + 1)
        }
      })
    }

    flattenChildren(root.children)

    return flatArray
  }

  function formatRelativeTime(dateString) {
    const currentDateTime = DateTime.local()
    const dateTime = DateTime.fromISO(dateString)
    const diff = currentDateTime
      .diff(dateTime)
      .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')

    if (Math.abs(diff.years) >= 1) {
      return `${Math.abs(Math.floor(diff.years))}Y`
    } else if (Math.abs(diff.months) >= 1) {
      return `${Math.abs(Math.floor(diff.months))}mo`
    } else if (Math.abs(diff.days) >= 1) {
      return `${Math.abs(Math.floor(diff.days))}d`
    } else if (Math.abs(diff.hours) >= 1) {
      return `${Math.abs(Math.floor(diff.hours))}h`
    } else if (Math.abs(diff.minutes) >= 1) {
      return `${Math.abs(Math.floor(diff.minutes))}m`
    } else {
      return `${Math.abs(Math.floor(diff.seconds))}s`
    }
  }

  function sendVote(comment_id, vote) {
    return new Promise(async (resolve, reject) => {
      try {
        await api.commentVote(comment_id, vote)
        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  function saveComment(comment_id, saved) {
    return new Promise(async (resolve, reject) => {
      try {
        await api.commentSave(comment_id, saved)
        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  return {
    sort,
    view,
    getComments,
    sendVote,
    saveComment
  }
})
