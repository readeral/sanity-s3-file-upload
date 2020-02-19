# sanity-s3-file-upload
A collection of files to assist those trying to roll their own upload to AWS S3 from the Sanity Studio

Essentially, this project has two parts - the first is the audio-player.js file which can be used in the Studio as a custom input component:
```
    {
      title: 'Audio',
      name: 'file',
      type: 'string',
      inputComponent: AudioPlayer
    }
```

Obviously your use case may not be for an audio file upload and player, in which case, amend the render function as suits your use-case.

The second part is the serverless function (AWS Lambda, or whatever you use) in presigned-post-lambda.js which creates the presigned-post-data object that is passed back to enable the desired file to be uploaded. You'll need to drop this into a new node project with the structure required by your serverless service of choice, with a package.json and the various dependencies referenced in the presigned-post-lambda.js file installed in the project.

Eventually I'll probably make this a plugin for sanity proper.
