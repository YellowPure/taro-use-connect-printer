/**
 * @module:  打印hooks
 * @author Liang Huang
 * @date 2021-10-18 15:59:55
 */

import Taro, { onBluetoothDeviceFound } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';
import { uniqBy } from 'ramda';
import { useLocalStorage } from './useLocalStorage';
import { useMap } from './useMap';

const __DEV__ = process.env.NODE_ENV === 'development';

/**
 * 已连接列表的本地储存
 */
const PRINT_LIST = 'taro_printer_list';

// ArrayBuffer转16进度字符串示例
const ab2hex = (buffer: ArrayBuffer) => {
  const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit: { toString: (arg0: number) => any }) {
    return `00${bit.toString(16)}`.slice(-2);
  });
  return hexArr.join('');
};

export type IConnectDevice = (device: onBluetoothDeviceFound.CallbackResultBlueToothDevice) => void;

export interface UseConnectPrinter {
  /**
   * 特征码
   */
  writeChara: {
    serviceId: string;
    writeId: string;
  };
  /**
   * 搜索中
   */
  searching: boolean;
  /**
   * 连接蓝牙低功耗设备设备
   */
  connectDevice: IConnectDevice;
  /**
   * 搜索到的蓝牙低功耗设备列表
   */
  searchPrintList: onBluetoothDeviceFound.CallbackResultBlueToothDevice[];
  /**
   * 已连接过的蓝牙低功耗设备列表
   */
  savedPrintList: onBluetoothDeviceFound.CallbackResultBlueToothDevice[];
  /**
   * 连接的低功耗蓝牙设备
   */
  connectedPrint: onBluetoothDeviceFound.CallbackResultBlueToothDevice;
  /**
   * 开始搜索蓝牙低功耗设备
   */
  startBluetooth: () => void;
  /**
   * 初始化蓝牙适配器
   */
  initAdapter: () => void;
}

export function useConnectPrinter(): UseConnectPrinter {
  /**
   * 搜索状态
   */
  const [searching, setSearching] = useState<boolean>(false);
  /**
   * 搜索到的蓝牙设备列表
   */
  const [searchPrintList, setSearchPrintList] = useState<onBluetoothDeviceFound.CallbackResultBlueToothDevice[]>([]);
  /**
   * 已连接过的蓝牙设备列表
   */
  const [savedPrintList, setSavedPrintList] = useLocalStorage(PRINT_LIST, []);
  /**
   * 打印机Map deviceId => Object
   */
  const [, { set: setMap, remove: removeMap }] = useMap();

  /**
   * 已连接的打印机
   */
  const [connectedPrint, setConnectedPrint] = useState<any>();
  /**
   * 设备id
   */
  const [deviceId, setDeviceId] = useState('');
  /**
   * 记录延时id
   */
  const timeRef = useRef<any>(null);
  /**
   * 特征码
   */
  const [writeChara, setwriteChara] = useState({
    serviceId: '',
    writeId: ''
  });
  useEffect(() => {
    // console.log('deviceId', deviceId);

    if (deviceId) {
      setMap(deviceId, connectedPrint);
      onBLEConnectionStateChange(deviceId);
    }

    return () => {
      if (__DEV__) {
        console.log('close deviceId');
      }
      Taro.closeBLEConnection({
        deviceId
      });
    };
  }, [deviceId]);

  const showTip = (data: string) => {
    Taro.showModal({
      content: data,
      showCancel: false
    });
  };

  /**
   * 监听蓝牙设备连接状态
   * @param {string} _deviceId
   */
  const onBLEConnectionStateChange = (_deviceId: string) => {
    if (__DEV__) {
      console.log('onBLEConnectionStateChange bind', _deviceId);
    }
    const onBLEChangeFn = (res: { deviceId: unknown; connected: any }) => {
      if (__DEV__) {
        console.log('onBLEConnectionStateChange res:', res);
      }
      if (!res.connected) {
        removeMap(res.deviceId);
        // @ts-ignore
        Taro.offBLEConnectionStateChange(onBLEChangeFn);
      }
    };
    Taro.onBLEConnectionStateChange(onBLEChangeFn);
  };
  /**
   * 开始执行流程 搜索蓝牙设备
   * @returns
   */
  const startBluetooth = async () => {
    try {
      const res = await initAdapter();
      startBluetoothDevicesDiscovery();
      return res;
    } catch (error) {
      return error;
    }
  };

  /**
   * 初始化蓝牙模块
   * @returns
   */
  const initAdapter = async () => {
    if (!Taro.openBluetoothAdapter) {
      showTip('当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。');
      return;
    }
    try {
      const res = await Taro.openBluetoothAdapter();
      if (__DEV__) {
        console.log('openBluetoothAdapter:', res);
      }
      const stateRes = await Taro.getBluetoothAdapterState();
      const { discovering } = stateRes; // 蓝牙适配器是否可用
      setSearching(discovering);
      if (__DEV__) {
        console.log('getBluetoothAdapterState:', stateRes);
      }
      return [res, stateRes];
    } catch (error) {
      if (__DEV__) {
        console.log('initAdapter error', error);
      }
      return error;
    }
  };

  /**
   * 侦听蓝牙模块搜索
   */
  const _onBluetoothDeviceFound = () => {
    const foundList: onBluetoothDeviceFound.CallbackResultBlueToothDevice[] = [];
    onBluetoothDeviceFound(res => {
      const devices = res.devices.filter(d => d.name);
      if (__DEV__) {
        console.log('searched new devices:', devices);
      }
      devices.forEach(item => {
        const { advertisData, advertisServiceUUIDs, name, localName } = item;
        if ((advertisData || advertisServiceUUIDs) && (name || localName)) {
          const has = [...foundList, ...savedPrintList].some(s => s.deviceId === item.deviceId);
          if (!has) {
            foundList.push(item);
          }
        }
      });
    });

    timeRef.current = setTimeout(() => {
      setSearching(false);
      if (__DEV__) {
        console.log('onBluetoothDeviceFound foundedList:', foundList);
      }
      setSearchPrintList(foundList);
      stopDiscovery();
    }, 5000);
  };

  /**
   * 停止搜索，清除计时
   */
  const stopDiscovery = () => {
    Taro.stopBluetoothDevicesDiscovery({
      success() {}
    });
    clearTimeout(timeRef.current);
  };

  /**
   * 搜索附件的蓝牙设备
   */
  const startBluetoothDevicesDiscovery = () => {
    setSearching(true);
    Taro.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true, // 是否允许重复上报同一设备
      success(res) {
        if (__DEV__) {
          console.log('搜索附近蓝牙设备', res);
        }
        /**
         * 新设备
         */
        _onBluetoothDeviceFound();
      },
      fail() {
        setSearching(false);
      }
    });
  };

  /**
   * 配对连接低功耗蓝牙
   * @param printer
   */
  const connectDevice = (printer: { deviceId: any }) => {
    const _deviceId = printer.deviceId;
    Taro.showLoading({
      title: '连接中...',
      mask: true
    });
    Taro.createBLEConnection({
      deviceId: _deviceId,
      success() {
        Taro.hideLoading();
        showTip('连接成功');
        getPinfo();
        stopDiscovery();
        setDeviceId(_deviceId);

        if (__DEV__) {
          console.log('connected print:', printer);
        }
        setConnectedPrint({ ...printer, connected: true });
        setSavedPrintList(uniqBy((item: any) => item.deviceId, [printer, ...savedPrintList.slice()]));
        getBLEDeviceServices(_deviceId);
      },
      fail(res) {
        Taro.hideLoading();
        if (__DEV__) {
          console.log('createBLEConnection fail:', res);
        }
        showTip('连接失败');
        closeBLEConnection();
      }
    });
  };

  const getPinfo = () => {
    // console.log('开始接收数据');
    Taro.onBLECharacteristicValueChange(function (res) {
      console.log(`characteristicId：${res.characteristicId}`);
      console.log(`serviceId:${res.serviceId}`);
      console.log(`deviceId${res.deviceId}`);
      console.log(`Length:${res.value.byteLength}`);
      console.log(`phexvalue:${ab2hex(res.value)}`);
    });
  };

  /**
   * 获取蓝牙设备所有服务
   * @param did
   */
  const getBLEDeviceServices = (did: any) => {
    Taro.getBLEDeviceServices({
      deviceId: did,
      success(res) {
        filterServiceNew(did, res.services);
        if (__DEV__) {
          console.log('蓝牙设备所有服务', res.services);
        }
      },
      fail(res) {
        if (__DEV__) {
          console.log('getBLEDeviceServices error:', res);
        }
        // showTip('获取设备服务失败');
        closeBLEConnection();
      }
    });
  };
  const delayGetBLE = (did: any, service: { uuid: any }) => {
    let serviceId = '';
    const { uuid } = service;
    // if (uuid.toUpperCase().indexOf(services_uuid) !== -1) {
    const timeId = setTimeout(function () {
      clearTimeout(timeId);
      serviceId = uuid;
      getBLEDeviceCharacteristics(did, serviceId);
    }, 800);
    // }
  };
  const filterServiceNew = (did: any, services: string | any[]) => {
    for (let i = 0; i < services.length; i++) {
      delayGetBLE(did, services[i]);
    }
  };

  // 获取蓝牙设备某个服务中的所有特征值
  const getBLEDeviceCharacteristics = (did: string, serviceId: string) => {
    if (__DEV__) {
      console.log('did:::', did, serviceId);
    }
    Taro.getBLEDeviceCharacteristics({
      deviceId: did,
      serviceId,
      success(res) {
        let writeId = '';
        // const readId = '';
        // 这里会存在特征值是支持write，写入成功但是没有任何反应的情况
        if (__DEV__) {
          console.log('getBLEDeviceCharacteristics', res);
        }
        // 只能一个个去试
        for (let i = 0; i < res.characteristics.length; i++) {
          const charc = res.characteristics[i];
          if (charc.properties.write) {
            // console.log('charc: uuid', charc.uuid, serviceId);
            writeId = charc.uuid;
            setwriteChara({
              serviceId,
              writeId
            });
            break;
          }
        }
      },
      fail() {}
    });
  };

  const closeBLEConnection = () => {
    Taro.closeBLEConnection({
      deviceId,
      success() {}
    });
  };

  return {
    /**
     * 特征码
     */
    writeChara,
    /**
     * 搜索中
     */
    searching,
    /**
     * 连接蓝牙低功耗设备设备
     */
    connectDevice,
    /**
     * 搜索到的蓝牙低功耗设备列表
     */
    searchPrintList,
    /**
     * 已连接过的蓝牙低功耗设备列表
     */
    savedPrintList,
    /**
     * 连接的低功耗蓝牙设备
     */
    connectedPrint,
    /**
     * 开始搜索蓝牙低功耗设备
     */
    startBluetooth,
    /**
     * 初始化蓝牙适配器
     */
    initAdapter
  };
}
