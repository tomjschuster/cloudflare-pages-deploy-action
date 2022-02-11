#!/bin/bash

# Run as: table.sh < {input-file-name} > {output-file-name}
current_date=$(date -u +"%Y-%m-%dT%H:%M:%S%Z")
current_sha1=$(git rev-parse HEAD)
current_branch=$(git rev-parse --abbrev-ref HEAD)
build_color_1=$(xxd -u -l 3 -p /dev/urandom)
build_color_2=$(xxd -u -l 3 -p /dev/urandom)

mkdir -p out


cat << EOF > out/index.html
<!DOCTYPE html>
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
        background-color: #$build_color_1;
        background-image: linear-gradient(to right, #$build_color_1, #$build_color_2);
      }

 
    </style>
  </head>
  <body>
    <h1 class="title">Cloud Flare Pages Deploy Action Test Site</h1>
    <div class="color-banner"></div>
    <table class="build-info">
      <thead>
        <caption class="build-title">Build Info</caption>
      </thead>
      <tbody>
        <tr>
          <td>Date</td>
          <td>$current_date</td>
        </tr>
        <tr>
          <td>SHA-1</td>
          <td>
            <a href="https://github.com/tomjschuster/cloudflare-pages-deploy-action/tree/$current_sha1">$current_sha1</a>
          </td>
        </tr>
        <tr>
          <td>Branch</td>
          <td>
            <a href="https://github.com/tomjschuster/cloudflare-pages-deploy-action/tree/$current_branch">$current_branch</a>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
EOF