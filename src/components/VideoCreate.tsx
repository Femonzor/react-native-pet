import * as React from 'react';
import {AlertIOS, AsyncStorage, Dimensions, Image, ImageResizeMode, ImageStyle, ProgressViewIOS, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import RNFS from 'react-native-fs';
import ImagePicker from 'react-native-image-picker';
import Video from 'react-native-video';
import config from '../common/config';
import request from '../common/request';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

type MediaType = 'photo' | 'video' | 'mixed' | undefined;
type VideoQuality = 'low' | 'medium' | 'high' | undefined;

const videoOptions = {
  title: '选择视频',
  cancelButtonTitle: '取消',
  takePhotoButtonTitle: '录制 10 秒视频',
  chooseFromLibraryButtonTitle: '选择已有视频',
  videoQuality: 'medium' as VideoQuality,
  mediaType: 'video' as MediaType,
  durationLimit: 10,
  noData: false,
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
};

interface Props {
  user?: any;
  logout?: () => void;
}

interface State {
  previewVideo: any;
  rate: number;
  muted: boolean;
  resizeMode: ImageResizeMode;
  repeat: boolean;
  videoReady: boolean;
  video: any;
  videoUploading: boolean;
  videoUploaded: boolean;
  videoProgress: number;
  videoUploadedProgress: number;
  videoTotal: number;
  currentTime: number;
  playing: boolean;
  paused: boolean;
  videoRight: boolean;
  user: any;
}

const cloudinaryConfig = {
  api_key: '668661248534544',
  audio: 'https://api.cloudinary.com/v1_1/yang/raw/upload',
  base: 'http://res.cloudinary.com/yang',
  cloud_name: 'yang',
  image: 'https://api.cloudinary.com/v1_1/yang/image/upload',
  video: 'https://api.cloudinary.com/v1_1/yang/video/upload',
};

export default class VideoCreate extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      user: this.props.user || {},
      previewVideo: null,
      rate: 1,
      muted: true,
      resizeMode: 'contain',
      repeat: false,
      videoReady: false,
      video: null,
      videoUploading: false,
      videoUploaded: false,
      videoProgress: 0.01,
      videoUploadedProgress: 0.01,
      videoTotal: 0,
      currentTime: 0,
      playing: false,
      paused: false,
      videoRight: true,
    };
  }
  _pickVideo = () => {
    ImagePicker.showImagePicker(videoOptions, async (response) => {
      if (response.didCancel) {
        return;
      }
      const uri = response.uri;
      this.setState({
        previewVideo: uri,
      });
      const video = await RNFS.readFile(uri, 'base64');
      const timestamp = Date.now();
      const tags = 'app,video';
      const folder = 'react-native-pet/video';
      const accessToken = this.state.user.accessToken;
      const signatureUrl = `${config.api.base}${config.api.signature}`;
      request.post(signatureUrl, {
        accessToken,
        timestamp,
        type: 'video',
        folder,
        tags,
      })
      .then(data => {
        console.log(data);
        if (data && data.code === 0) {
          const signature = data.data;
          const body = new FormData();
          body.append('folder', folder);
          body.append('signature', signature);
          body.append('tags', tags);
          body.append('timestamp', `${timestamp}`);
          body.append('api_key', cloudinaryConfig.api_key);
          body.append('resource_type', 'video');
          body.append('file', `data:video/mp4;base64,${video}`);
          this._uploadVideo(body);
        }
      })
      .catch(error => {
        console.log(error);
      });
    });
  }
  _uploadVideo(body: FormData) {
    const xhr = new XMLHttpRequest();
    const url = cloudinaryConfig.video;
    console.log(body);
    this.setState({
      videoUploadedProgress: 0,
      videoUploading: true,
      videoUploaded: false,
    });
    xhr.open('POST', url);
    xhr.onload = () => {
      if (xhr.status !== 200) {
        AlertIOS.alert('请求失败');
        console.log(xhr.responseText);
        return;
      }
      if (!xhr.responseText) {
        AlertIOS.alert('请求失败');
        return;
      }
      let response;
      try {
        response = JSON.parse(xhr.response);
      } catch (e) {
        console.log(e);
        console.log('parse fails');
      }
      if (response && response.public_id) {
        this.setState({
          video: response,
          videoUploading: false,
          videoUploaded: true,
        });
      }
    };
    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Number((event.loaded / event.total).toFixed(2));
          this.setState({
            videoUploadedProgress: percent,
          });
        }
      };
    }
    xhr.send(body);
  }
  _onLoadStart = () => {
    console.log('start');
  }
  _onLoad = () => {
    console.log('load');
  }
  _onProgress = (data: any) => {
    const { currentTime, playableDuration } = data;
    const percent = Number((currentTime / playableDuration).toFixed(2));
    const newState: any = {
      videoTotal: playableDuration,
      currentTime: Number(currentTime.toFixed(2)),
      videoProgress: percent,
    };
    if (!this.state.videoReady) {
      newState.videoReady = true;
    }
    if (!this.state.playing) {
      newState.playing = true;
    }
    this.setState(newState);
  }
  _onEnd = () => {
    this.setState({
      videoProgress: 1,
      playing: false,
    });
  }
  _onError = (error: any) => {
    this.setState({
      videoRight: false,
    });
    console.log(error);
    console.log('error');
  }
  componentDidMount() {
    AsyncStorage.getItem('user')
     .then((data: any) => {
       const user = data ? JSON.parse(data) : null;
       if (user && user.accessToken) {
         this.setState({
           user,
         });
       }
     });
  }
  render() {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>
          {this.state.previewVideo ? '点击按钮配音' : '开始配音'}
          </Text>
          <Text style={styles.toolbarEdit} onPress={this._pickVideo}>更换视频</Text>
        </View>
        <View style={styles.page}>
        {
          this.state.previewVideo
          ? <View style={styles.videoContainer}>
              <View style={styles.videoBox}>
              <Video
                source={{uri: this.state.previewVideo}}
                style={styles.video}
                volume={5}
                paused={this.state.paused}
                rate={this.state.rate}
                muted={this.state.muted}
                resizeMode={this.state.resizeMode}
                repeat={this.state.repeat}
                onLoadStart={this._onLoadStart}
                onLoad={this._onLoad}
                onProgress={this._onProgress}
                onEnd={this._onEnd}
                onError={this._onError}
              />
              {
                !this.state.videoUploaded && this.state.videoUploading
                ? <View style={styles.progressTipBox}>
                  <ProgressViewIOS style={styles.progressBar} progressTintColor='#ee735c' progress={this.state.videoUploadedProgress}>
                    <Text style={styles.progressTip}>
                      正在生成静音视频，已完成{(this.state.videoUploadedProgress * 100).toFixed(2)}%
                    </Text>
                  </ProgressViewIOS>
                </View>
                : null
              }
              </View>
            </View>
          : <TouchableOpacity style={styles.uploadContainer} onPress={this._pickVideo}>
            <View style={styles.uploadBox}>
              <Image source={require('../assets/images/record.png')} style={styles.uploadIcon as ImageStyle} />
              <Text style={styles.uploadTitle}>点击上传视频</Text>
              <Text style={styles.uploadDesc}>建议时长不超过 20 秒</Text>
            </View>
          </TouchableOpacity>
        }
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    flex: 1,
  },
  toolbar: {
    backgroundColor: '#ee735c',
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 25,
  },
  toolbarEdit: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
    right: 10,
    textAlign: 'right',
    top: 26,
  },
  toolbarTitle: {
    color: '#fff',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadBox: {
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  uploadContainer: {
    backgroundColor: '#fff',
    borderColor: '#ee735c',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 90,
    paddingBottom: 10,
    width: width - 40,
  },
  uploadDesc: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  uploadIcon: {
    resizeMode: 'contain',
    width: 110,
  },
  uploadTitle: {
    color: '#000',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  videoContainer: {
    width,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  videoBox: {
    width,
    height: height * 0.6,
    backgroundColor: '#333',
  },
  video: {
    width,
    height: height * 0.6,
    backgroundColor: '#333',
  },
  progressTipBox: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width,
    height: 30,
    backgroundColor: 'rgba(244, 244, 244, 0.65)',
  },
  progressBar: {
    width,
  },
  progressTip: {
    color: '#333',
    width: width - 10,
    padding: 5,
    height: 30,
  },
});
