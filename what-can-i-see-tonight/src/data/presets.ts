import type { CameraConfig, TelescopeConfig } from '../types';

export interface TelescopePreset extends TelescopeConfig {
  name: string;
}

export interface CameraPreset extends CameraConfig {
  // already has name, sensorWidth, sensorHeight
}

export const TELESCOPE_PRESETS: TelescopePreset[] = [
  { name: 'Celestron NexStar 8 SCT',   focalLength: 2032, aperture: 203, reducerFactor: 1 },
  { name: 'Celestron NexStar 6 SCT',   focalLength: 1500, aperture: 150, reducerFactor: 1 },
  { name: 'Celestron C8 f/6.3 (reduced)', focalLength: 1280, aperture: 203, reducerFactor: 0.63 },
  { name: 'Sky-Watcher 8" Dobsonian',  focalLength: 1200, aperture: 203, reducerFactor: 1 },
  { name: 'Sky-Watcher 10" Dobsonian', focalLength: 1200, aperture: 254, reducerFactor: 1 },
  { name: 'Orion XT6 Dobsonian',       focalLength: 1200, aperture: 150, reducerFactor: 1 },
  { name: 'Refractor 80mm f/6',        focalLength: 480,  aperture: 80,  reducerFactor: 1 },
  { name: 'Refractor 102mm f/10',      focalLength: 1000, aperture: 102, reducerFactor: 1 },
  { name: 'Refractor 120mm f/7.5',     focalLength: 900,  aperture: 120, reducerFactor: 1 },
  { name: 'Sky-Watcher ED80 APO',      focalLength: 600,  aperture: 80,  reducerFactor: 1 },
  { name: 'William Optics Z73',        focalLength: 430,  aperture: 73,  reducerFactor: 1 },
  { name: 'Takahashi FSQ-85ED',        focalLength: 450,  aperture: 85,  reducerFactor: 1 },
  { name: 'Meade 12" LX200',           focalLength: 3048, aperture: 305, reducerFactor: 1 },
  { name: 'Custom / Other',            focalLength: 800,  aperture: 100, reducerFactor: 1 },
];

export const CAMERA_PRESETS: CameraPreset[] = [
  // DSLRs / Mirrorless
  { name: 'APS-C (Canon)',        sensorWidth: 22.3, sensorHeight: 14.9 },
  { name: 'APS-C (Nikon)',        sensorWidth: 23.6, sensorHeight: 15.7 },
  { name: 'APS-C (Sony/Fuji)',    sensorWidth: 23.5, sensorHeight: 15.6 },
  { name: 'Full Frame (35mm)',    sensorWidth: 36.0, sensorHeight: 24.0 },
  { name: 'Micro Four Thirds',    sensorWidth: 17.3, sensorHeight: 13.0 },
  { name: '1-inch sensor',        sensorWidth: 13.2, sensorHeight: 8.8  },
  // Dedicated astro cameras
  { name: 'ZWO ASI294MC',        sensorWidth: 19.1, sensorHeight: 13.0 },
  { name: 'ZWO ASI533MC',        sensorWidth: 11.3, sensorHeight: 11.3 },
  { name: 'ZWO ASI183MC',        sensorWidth: 13.2, sensorHeight: 8.8  },
  { name: 'ZWO ASI2600MC',       sensorWidth: 28.3, sensorHeight: 19.0 },
  { name: 'ZWO ASI071MC (APS-C)',sensorWidth: 23.6, sensorHeight: 15.7 },
  { name: 'IMX585 (1/1.2")',      sensorWidth: 9.6,  sensorHeight: 7.2  },
  { name: 'QHY268M (APS-C)',      sensorWidth: 23.5, sensorHeight: 15.7 },
  { name: 'SBIG STF-8300',       sensorWidth: 17.96, sensorHeight: 13.52 },
  { name: 'Atik 16200',          sensorWidth: 36.8, sensorHeight: 36.8 },
  // Phones / small sensors
  { name: 'iPhone (wide)',        sensorWidth: 7.6,  sensorHeight: 5.7  },
  { name: 'Custom / Other',       sensorWidth: 22.3, sensorHeight: 14.9 },
];

export const DEFAULT_TELESCOPE: TelescopeConfig = {
  focalLength: 1000,
  aperture: 102,
  reducerFactor: 1,
};

export const DEFAULT_CAMERA: CameraConfig = {
  name: 'APS-C (Canon)',
  sensorWidth: 22.3,
  sensorHeight: 14.9,
};
