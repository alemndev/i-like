const fm = document.querySelector('form')

fm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const response = await fetch(e.target.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username_login: e.target[0].value,
      password_login: e.target[1].value,
    }),
  })

  let result = await response.json()

  const alert = document.createElement('span')
  alert.classList.add('alert')

  if (result.ok) {
    window.location.href = '/home'
  } else {
    if (result.err === 'username_or_password_incorrect') {
      alert.textContent = 'Username or password incorrect.'
    } else if (result.err === 'nope') {
      alert.textContent = `nope. ${result.data}`
    } else {
      alert.textContent = 'An unexpected error has occurred.'
    }

    document.querySelector('body').append(alert)

    setTimeout(() => {
      alert.remove()
    }, 2000)
  }
})
