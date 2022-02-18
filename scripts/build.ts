import { exec as exec_ } from 'child_process'
import fs from 'fs'
import util from 'util'
const exec = util.promisify(exec_)

build()

async function build(): Promise<void> {
  await ensureDir()
  const sha1 = await getGitSha1()
  const color1 = randomHexColor()
  const color2 = randomHexColor()
  const html = generateHtml(new Date(), sha1, color1, color2)

  console.log('Generating static HTML...')
  console.log('______________________________________________\n\n')

  console.log(html)
  fs.writeFileSync('out/index.html', html)

  console.log('\n______________________________________________')
  console.log('Static HTML generated.')
}

function ensureDir(): void {
  if (!fs.existsSync('out')) fs.mkdirSync('out')
}

async function getGitSha1(): Promise<string> {
  const { stdout: sha1 } = await exec('git rev-parse HEAD')
  return sha1.trim()
}

function randomHexColor(): string {
  return '#000000'.replace(/0/g, function () {
    return (~~(Math.random() * 16)).toString(16)
  })
}

function generateHtml(date: Date, sha1: string, color1: string, color2: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Cloud Flare Pages Deploy Action Test Site</title>
    <style>
      html {
        box-sizing: border-box;
        font-size: 16px;
      }

      *,
      *:before,
      *:after {
        box-sizing: inherit;
      }

      body,
      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      p,
      ol,
      ul {
        margin: 0;
        padding: 0;
        font-weight: normal;
      }

      * {
        font-family: arial;
      }

      .title,
      .color-banner {
        margin: 1rem 0;
      }

      .title, .build-info caption {
        text-align: center;
      }

      .build-info caption {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
      }

      .build-info {
        margin: 0 auto;
        border-collapse: collapse;
      }

      .build-info td {
        border: 1px solid black;
        padding: 0.5rem;
        text-align: left;
      }

      .build-info td:first-child {
        font-weight: bold;
      }

      .color-banner {
        height: 1.5rem;
        background-color: ${color1};
        background-image: linear-gradient(to right, ${color1}, ${color2});
      }

 
    </style>
  </head>
  <body>
    <h1 class="title"><a href="https://github.com/tomjschuster/cloudflare-pages-deploy-action">Cloud Flare Pages Deploy Action</a> Test Site</h1>
    <div class="color-banner"></div>
    <table class="build-info">
      <thead>
        <caption class="build-title">Build Info</caption>
      </thead>
      <tbody>
        <tr>
          <td>Date</td>
          <td>${date.toUTCString()}</td>
        </tr>
        <tr>
          <td>SHA-1</td>
          <td>
            <a href="https://github.com/tomjschuster/cloudflare-pages-deploy-action/tree/${sha1}">${sha1}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`
}
