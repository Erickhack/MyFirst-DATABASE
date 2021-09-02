'use strict';

const http = require('http');

const port = 9999;
const statusBadReq = 400;
const statusNotFaund = 404;
const statusOk = 200;
const errorHtml = `
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
<hr/>
<i>Apache/2.4.47 (Win64) OpenSSL/1.1.1k PHP/7.4.19 Server at localhost Port 80</i>
`;

let nextId = 1;
let posts = [];

function sendResponse(res, {status = statusOk, headers = {}, body = null}) {
    Object.entries(headers).forEach(([kay, value]) => {
        res.setHeader(kay, value);
    });
    res.writeHead(status);
    res.end(body);
}

function sendJSON(res, body) {
    const space = 2;
    sendResponse(res, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body, null, space),
    });
}

function filtredPost(filtered) {
    return filtered.filter(i => !i.removed);
}

const methods = new Map();

methods.set('/posts.get', ({res}) => {
    const filtred = filtredPost(posts);
    sendJSON(res, filtredPost(filtred));
    console.table(posts);
});
methods.set('/posts.getById', ({res, searchParams}) => {
    const id = +searchParams.get('id');

    if (!searchParams.has('id') || isNaN(id)) {
        sendResponse(res, {status: statusBadReq, body: errorHtml});
        return;
    }
    
    // const idPost = posts.filter(o => o.id === parseInt(id, 10));
    const filtred = filtredPost(posts);
    const idPost = filtred.find(i => i.id === +id);

    if (idPost === undefined) {
        sendResponse(res, {status: statusNotFaund, body: errorHtml});
        return;
    }
    sendJSON(res, idPost);
});
methods.set('/posts.post', ({res, searchParams}) => {
    if (!searchParams.has('content')) {
        sendResponse(res, {status: statusBadReq, body: errorHtml});
        return;
    }

    const content = searchParams.get('content');

    const post = {
        id: nextId++,
        content: content,
        created: Date.now(),
        removed: false,
    };

    posts.unshift(post);
    sendJSON(res, post);
});
methods.set('/posts.edit', ({res, searchParams}) => {
    const editId = +searchParams.get('id');
    const editContent = searchParams.get('content');

    if (isNaN(editId) || !searchParams.has('id') || !searchParams.has('content')) {
        sendResponse(res, {status: statusBadReq, body: errorHtml});
        return;
    }

    const filtred = filtredPost(posts);
    const postId = filtred.find(i => i.id === +editId);

    if (postId === undefined) {
        sendResponse(res, {status: statusNotFaund, body: errorHtml});
        return;
    }

    postId.content = editContent;
    sendJSON(res, postId);
});

methods.set('/posts.delete', function ({ res:response, searchParams }) {
    const id = searchParams.get('id');
  
    if (isNaN(+id) || !searchParams.has('id') || (id !== null && !id.length)) {
      sendResponse(response, { status: statusBadReq });
      return;
    }
  
    const availablePosts = posts.filter((i) => !i.removed);
    const post = availablePosts.filter((i) => i.id === +id)[0];
  
    if (post === undefined) {
      sendResponse(response, { status: statusNotFaund });
      return;
    }
  
    posts = posts.map((i) => {
      if (i.id !== +id) {
        return i;
      }
  
      i.removed = true;
      return i;
    });

    sendJSON(response, post);

});
    

http.createServer((req, res) => {
    const {pathname, searchParams} = new URL(req.url, `http://${req.headers.host}`);
    const method = methods.get(pathname);

    if (method === undefined) {
        sendResponse(res, {status: statusNotFaund, body: errorHtml});
        return;
    }

    const params = {
        req,
        res,
        pathname,
        searchParams,
    };

    method(params);
    
}).listen(port);