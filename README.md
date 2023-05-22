# Maho
Tiny database library

# Installation
```
npm i littletsu/maho
```

# Example
```ts
import { Database, Schema } from "maho";

const userSchema: Schema = {
    // 16 byte string
    username: {
        type: String,
        size: 16
    },

    // 32 bit signed integer
    balance: {
        type: Number,
        size: 32
    },
    // 8 bit unsigned integer
    id: {
        type: Number,
        size: -8
    }
}

const db = new Database();

// Initializing database path and schema
await db.init("./database.maho", userSchema);

// Push data to it

await db.push({
    username: "user1",
    balance: 150,
    id: 24
})

// This will not write to the database file, but it will be pushed to the objects in the database
// And it will be written to the file in the next database write
await db.push({
    username: "user2",
    balance: 92,
    id: 54
}, false) 

await db.push({
    username: "user3",
    balance: 17,
    id: 64
})

// Getting data from the database

// Objects can only be retrieved by the index they were pushed by

db.get(0); /*
{
    username: "user1",
    balance: 150,
    id: 24
}
*/

// Iterating through all objects in the database
for(let object of db.objects) {
    console.log(`${object.username} - ${object.balance}`);
} /*
    user1 - 150
    user2 - 92
    user3 - 17
*/


// Updating objects in the database

await db.set(1, {
    balance: 21
})

console.log(db.get(1).balance) // 21


// Deleting objects from the database

// Only deleting the last element added is possible
await db.pop()

console.log(db.objects.length) // 2
```
