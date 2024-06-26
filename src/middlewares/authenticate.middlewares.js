import User from '../database/models/User.models'
import { filterUserData } from '../lib/filterData'
import { validateToken } from '../lib/manageToken'

export async function authenticate(req, res, next) {
  const TOKEN = req.cookies.token
  const LOW_LEVEL_ROUTES = ['/', '/login', '/register']
  const WITHOUT_AUTENTICATION_ROUTES = ['/posts']
  let baseUrl = req._parsedUrl.href.split('/').filter((str) => str.length)[0]

  if (!baseUrl) baseUrl = LOW_LEVEL_ROUTES[0]
  else baseUrl = '/' + baseUrl

  if (!TOKEN && WITHOUT_AUTENTICATION_ROUTES.includes(baseUrl)) return next()

  if (!TOKEN && !LOW_LEVEL_ROUTES.includes(baseUrl)) {
    res.redirect('/login')
    return
  }

  const checkToken = validateToken(TOKEN)
  if (!checkToken.result) {
    res.clearCookie('token')
    if (LOW_LEVEL_ROUTES.includes(baseUrl)) return next()
    res.redirect('/login')
  }

  const getUser = await User.findById(checkToken.data.id)

  if (LOW_LEVEL_ROUTES.includes(baseUrl)) {
    req.user = filterUserData(getUser)
    res.redirect('/home')
    return
  }

  req.user = filterUserData(getUser)
  next()
}
