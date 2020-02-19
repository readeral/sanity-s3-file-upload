import React from 'react';
import PropTypes from 'prop-types';
import {StyledPlayer} from '@newfrontdoor/audio-player';
import PatchEvent, {set, unset} from 'part:@sanity/form-builder/patch-event';
import Dropzone from 'react-dropzone';
import {ScaleLoader} from 'react-spinners';
import {retry} from '@lifeomic/attempt';

const createPatchFrom = value =>
  PatchEvent.from(value === '' ? unset() : set(value));

const bucket = 'MY_BUCKET_KEY';
const AWS_PREFIX = 'https://s3.us-west-2.amazonaws.com';

const getPresignedPostData = (selectedFile, bucket) => {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();

    // Set the proper URL here.
    const url = 'SERVERLESS_FUNCTION_URL';

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(
      JSON.stringify({
        name: selectedFile.name,
        type: selectedFile.type,
        bucket
      })
    );
    xhr.addEventListener('load', e => {
      resolve(JSON.parse(e.target.response));
    });
  });
};

const uploadFileToS3 = (presignedPostData, file) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    Object.keys(presignedPostData.fields).forEach(key => {
      formData.append(key, presignedPostData.fields[key]);
    });
    // Actual file has to be appended last.
    formData.append('file', file);

    fetch(presignedPostData.url, {
      method: 'post',
      body: formData
    }).then(response => {
      if (response.status === 204) {
        resolve();
      } else {
        reject(response);
      }
    });
  });
};

const baseStyle = {
  borderWidth: 2,
  borderColor: '#666',
  borderStyle: 'dashed',
  borderRadius: 5
};
const activeStyle = {
  borderStyle: 'solid',
  borderColor: '#6c6',
  backgroundColor: '#eee'
};
const rejectStyle = {
  borderStyle: 'solid',
  borderColor: '#c66',
  backgroundColor: '#eee'
};

export default class AudioPlayer extends React.Component {
  state = {
    fileOnS3: false,
    error: false
  };

  static propTypes = {
    type: PropTypes.shape({
      title: PropTypes.string
    }).isRequired,
    value: PropTypes.string
  };

  onDrop = acceptedFiles => {
    this.activateUpload(acceptedFiles[0], bucket);
    this.setState({fileName: acceptedFiles[0].name});
  };

  async activateUpload(selectedFile, bucket) {
    await getPresignedPostData(selectedFile, bucket).then(data => {
      this.completeUpload(selectedFile, data.data);
    });
  }

  completeUpload(selectedFile, key) {
    try {
      uploadFileToS3(key, selectedFile)
        .then(() => {
          this.setState({
            fileOnS3: true
          });
        })
        .catch(() => {
          console.log('there was a problem with setting fileonS3 to true');
        });
      console.log(key.fields.key);
      this.props.onChange(createPatchFrom(key.fields.key));
      console.log('File was successfully uploaded!');
    } catch (error) {
      console.log('An error occurred!', error.message);
    }
  }

  checkAWS = async () => {
    const response = await fetch(
      `${AWS_PREFIX}/${bucket}/${this.props.value}`,
      {
        method: 'HEAD',
        redirect: 'follow'
      }
    );

    // Abort retrying if the resource doesn't exist
    if (response.status !== 200) {
      throw new Error(response.statusText);
    }

    return true;
  };

  componentDidMount() {
    if (this.props.value) {
      (async () => {
        const result = await retry(this.checkAWS, {
          delay: 4000,
          factor: 2,
          maxAttempts: 4
        });
        this.setState({
          fileOnS3: result
        });
      })().catch(error => {
        console.log(error);
        this.setState({
          error: true
        });
      });
    }
  }

  render() {
    const {type, value} = this.props;
    return (
      <div>
        <h2>{value ? type.title : 'Upload Audio'}</h2>
        {value && this.state.fileOnS3 ? (
          <StyledPlayer
            hasPlaybackSpeed
            hasBorder
            isInvert={false}
            highlight="#548BF4"
            base="#ddd"
            audio={`${AWS_PREFIX}/${bucket}/${value}`}
          />
        ) : value && this.state.error ? (
          <div>
            Audio could not load due to an error. Please contact
            support@newfrontdoor.org.
          </div>
        ) : value ? (
          <div>
            <ScaleLoader
              height={30}
              width={10}
              radius={2}
              margin="2px"
              color="#36D7B7"
            />
            <p>Loading audio file...</p>
            <p>
              N.b. It's ok to hit the 'Publish' button below while file is
              loading.
            </p>
          </div>
        ) : (
          <div style={{width: '100%'}}>
            <Dropzone accept="audio/*" onDrop={this.onDrop}>
              {({getRootProps, getInputProps, isDragActive, isDragReject}) => {
                let styles = {...baseStyle};
                styles = isDragActive ? {...styles, ...activeStyle} : styles;
                styles = isDragReject ? {...styles, ...rejectStyle} : styles;
                return (
                  <div {...getRootProps()} style={styles}>
                    <input {...getInputProps()} />
                    {this.state.fileName ? (
                      <p>'{this.state.fileName}' is uploading...</p>
                    ) : isDragReject ? (
                      <p>Unsupported file type...</p>
                    ) : (
                      <p>
                        Try dropping an audio file here, or click to select file
                        for upload.
                      </p>
                    )}
                  </div>
                );
              }}
            </Dropzone>
          </div>
        )}
      </div>
    );
  }
}
