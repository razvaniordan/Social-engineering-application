module.exports = (err,_req,res,_next) => {        // handles servers errors
    console.log('An error ocurred : ' + err)        // logs the error into the console
    res.status(500).json({message: 'server error'}) // responds with status code 500 and message 'server error'
}
