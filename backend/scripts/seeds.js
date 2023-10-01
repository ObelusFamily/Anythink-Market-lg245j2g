const mongoose = require('mongoose');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

require("../models/User");
require("../models/Item");
require("../models/Comment");

if (!process.env.MONGODB_URI) {
    console.warn("Missing MONGODB_URI in env, please add it to your .env file");
}

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
// mongoose.set("debug", true);

const User = mongoose.model('User');
const Item = mongoose.model('Item');
const Comment = mongoose.model('Comment');

function range(n1, n2) {
    if (isNaN(n1) || isNaN(n2)) throw new Error('n1 and n2 must be of type number');
    if (n1 > n2) throw new Error('n1 must be smaller than n2');
    let last = n1;
    const numbers = [];
    while (n2 >= last) {
        numbers.push(last);
        last++;
    }
    return numbers;
}

const ALLOWED_STRING_CODES = [
    ...range(48, 57), // numbers
    ...range(65, 90), // lowercase letters
    ...range(97, 122), // uppercase letters
]

function randomString(size = 4) {
    return Array.from(Array(size)).reduce((acc, _, i) => {
        const randomCode = ALLOWED_STRING_CODES[Math.floor(Math.random() * ALLOWED_STRING_CODES.length)]
        return `${acc}${String.fromCharCode(randomCode)}`
    }, '');
}

function printReadline() {
    readline.question(`======================================
    
Type the operation:
        
0 - Populate 100 users, 100 items and 100 comments;
1 - Clear db;
2 - Count documents;
3 - Exit.

======================================
User input: `, async operation => {
            
            switch (operation) {
                case '0':
                    await seedUsers();
                    break;
                case '1':
                    await clearDb();
                    break;
                case '2':
                    await countDocs();
                    break;
                case '3':
                    process.exit();
                default:
                    console.log('Unknown operation', operation);
                    printReadline();
            }
        });
}

async function seedUserItem(userId) {
    console.log('\tcreating item and comment for user', userId);
    const commentId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();

    const comment = new Comment({
        _id: commentId,
        seller: userId,
        body: `Comment for item ${itemId}`,
    });

    const item = new Item({
        _id: itemId,
        seller: userId,
        title: `Item from user ${userId}`,
        description: 'Fake description',
        tagList: ['test', 'development', userId],
        comments: [commentId]
    });

    await item.save().then(() => console.log('\tItem created successfully!', itemId));
    await comment.save().then(() => console.log('\tComment created successfully!', commentId));
}

async function seedUsers() {
    for (let i = 0; i < 100; i++) {
        console.log('creating user', i, '...');

        async function generateUser() {
            const password = randomString();
            const username = `user${password}`;

            const userId = new mongoose.Types.ObjectId();
            const user = new User({
                _id: userId,
                username,
                email: `${username}@anythink.com`,
            });
            await user.setPassword(password);
            return user
        }

        let success = false
        while (!success) {
            const newUser = await generateUser();
            await newUser.save()
                .then(async () => {
                    success = true;
                    console.log('User', i, 'created successfully!');
                    return await seedUserItem(newUser._id);
                })
                .catch(e => console.log('error for user', newUser._id, e))
        }
    }

    if (process.argv[2] === '--user-input') {
        printReadline();
    }
}

async function clearDb() {
    console.log('clearing db...');
    await Comment.deleteMany();
    await Item.deleteMany({ title: { $ne: 'My first item' } });
    await User.deleteMany({ username: { $ne: 'felipeam' } });
    console.log('db cleared successfully!');
    if (process.argv[2] === '--user-input') {
        setTimeout(() => printReadline(), 1500);
    }
}

async function countDocs() {
    console.log('counting documents...');
    const totalComments = await Comment.countDocuments();
    const totalItems = await Item.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log(`Totals
    
    users: ${totalUsers}
    items: ${totalItems}
    comments: ${totalComments}\n\n`);
    if (process.argv[2] === '--user-input') {
        setTimeout(() => printReadline(), 1500);
    }
}

mongoose.connection.on('connected', () => {
    if (process.argv[2] === '--user-input') {
        setTimeout(() => printReadline(), 1500);
    } else {
        seedUsers().then(() => {
            process.exit();
        });
    }
});
