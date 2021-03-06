require('dotenv').config()
const http = require('http')
const errorHandler = require('./errorHandler')
const headers = require('./crosHeader')
const mongoose = require('mongoose')
mongoose.connect(process.env.DB_HOST);

// Model
const Post = require('./model/PostModel')

const requestListener = async (request, res) => {

    let body = ''
    request.on('data', chunk => {
        body += chunk
    })

    const resourcePost = ({_id, content,name,image,likes,createdAt }) => ({
        id:_id,
        content,
        name,
        image,
        likes,
        createdAt
    })
    const resourcePosts = (posts) => posts.map((post) => resourcePost(post))
    const findAllPost = async () => {
        const posts = await Post.find()
        res.writeHead(200, headers)
        res.write(JSON.stringify({
            status: 'success',
            data: resourcePosts(posts)
        }))
        res.end()
    }

    // posts: GET
    if (request.url === "/posts" && request.method === "GET") {
        await findAllPost()
    } else if (request.url === "/posts" && request.method === "POST") {
        // posts: POST
        request.on('end', async () => {
            try {
                const {name, content, image} = JSON.parse(body)
                console.log('name', name)
                console.log('content', content)
                if (content && name) {
                    const post = await Post.create({
                        name,
                        content,
                        image,
                        createdAt: Date.now()
                    })
                    res.writeHead(200, headers)
                    res.write(JSON.stringify({
                        status: 'success',
                        data: resourcePost(post)
                    }))
                    res.end()
                } else {
                    errorHandler(res, "content or name欄位未填寫正確")
                }
            } catch (err) {
                errorHandler(res, "post新增失敗")
            }
        })
    } else if (request.url === "/posts" && request.method === "DELETE") {
        // posts: DELETE ALL
        await Post.deleteMany({})
        await findAllPost()
    } else if (request.url.startsWith("/posts/") && request.method === "DELETE") {
        // posts: DELETE One
        const id = request.url.split("/").pop()
        if (await Post.findByIdAndDelete(id)) {
            await findAllPost()
        } else {
            errorHandler(res, "刪除失敗：Post找不到該id")
        }
    } else if (request.url.startsWith("/posts/") && request.method === "PATCH") {
        // posts: PATCH One
        request.on('end', async () => {
            try {
                const {content} = JSON.parse(body)
                const id = request.url.split("/").pop()
                if (await Post.findByIdAndUpdate(id, {
                    content
                })) {
                    await findAllPost()
                } else {
                    errorHandler(res, "更新失敗：Post找不到該id")
                }
            } catch (err) {
                errorHandler(res, "更新失敗")
            }
        })
    } else if (request.method === "OPTIONS") {
        // posts: OPTIONS
        res.writeHead(200, headers)
        res.end()
    } else {
        res.writeHead(404, headers)
        res.write(JSON.stringify({
            status: 'error',
            message: '無此路由'
        }))
        res.end()
    }
}

const server = http.createServer(requestListener)
server.listen(process.env.PORT || 8080)
