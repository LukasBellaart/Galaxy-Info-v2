import { Router } from 'express'
import fetch from 'node-fetch'
import frontendLoggedIn from '../../middleware/frontendLoggedIn'
import { type Guild, Permissions } from 'discord.js'
import { serialize } from '@galaxyinfo/serialization'
import { sleep } from '../../../util/sleep'

interface Arg {
  GalaxyInfo: GalaxyInfo
}

export async function updatableGuilds ({ GalaxyInfo }: Arg) {
  const router = Router()

  router.get('/', frontendLoggedIn(), async (req, res) => {
    if (!req.discordUser) throw new Error('Not logged in')
    while (true) {
      let userGuilds = await (await fetch('https://discord.com/api/v9/users/@me/guilds', {
        headers: {
          Authorization: 'Bearer ' + req.discordUser._token
        }
      })).json()
      if (userGuilds.retry_after) {
        await sleep(userGuilds.retry_after / 1000)
        continue
      }
      if (userGuilds.message) { res.send(serialize({ error: userGuilds })); return }

      userGuilds = userGuilds.filter((guild: any) => {
        const guildPermissions = new Permissions(guild.permissions)
        return guildPermissions.has('ADMINISTRATOR') || guildPermissions.has('MANAGE_GUILD')
      })

      const botGuilds: any[] = ((await Promise.all(userGuilds.map(async (userGuild: any): Promise<any> => {
        const botGuild = GalaxyInfo.client.guilds.resolve(userGuild.id) as Guild | undefined
        if (!botGuild) return
        return {
          id: botGuild.id,
          name: botGuild.name,
          icon: botGuild.icon
        }
      }))) as any)
        .filter((guild: any) => guild)

      userGuilds = userGuilds.filter((userGuild: any) => !botGuilds.find((botGuild): any => userGuild.id === botGuild.id))

      botGuilds.sort(sortByProperty('name'))
      userGuilds.sort(sortByProperty('name'))

      res.send(serialize({ botGuilds, userGuilds }))
    }
  })

  return router
}

// https://medium.com/@asadise/sorting-a-json-array-according-one-property-in-javascript-18b1d22cd9e9
function sortByProperty (property: string) {
  return function (a: any, b: any) {
    a = JSON.parse(JSON.stringify(a))
    b = JSON.parse(JSON.stringify(b))

    a[property] = a[property].toLowerCase()
    b[property] = b[property].toLowerCase()
    if (a[property] > b[property]) { return 1 } else if (a[property] < b[property]) { return -1 }

    return 0
  }
}
