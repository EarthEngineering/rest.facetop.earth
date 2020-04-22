---
layout: post
title:  "Facetop Components and Tech Stack"
date:   2020-04-22 03:10:00 -0700
categories: facetop
---

## Introduction

According to [Security Today](https://securitytoday.com/articles/2020/01/13/the-iot-rundown-for-2020.aspx), during 2020 global spending on the Internet of Things (IoT) should reach $1.29 trillion. By 2021&mdash;the industrial IoT market size should reach $124 billion. By 2024&mdash;the global IoT healthcare market should reach $14 billion. By 2026&mdash;experts estimate that the IoT device market will reach $1.1 trillion.

It's clear that the Internet of Things is going to be massive and that it's here to stay. Facetop computing has been waiting for an IoT catalyst and due to COVID-19 we believe smart-masks will be gateway that takes Facetop computing mainstream.

## Components

### Raspberry Pi

At the heart of Facetop is the Raspberry Pi which comes fully equipped with a Broadcom system on a chip (SoC) with an integrated ARM-compatible CPU and on-chip GPU. Processor speed is 1.5 GHz with 4 GB of RAM. HDMI, 3.5mm audio jack as well as WIFI and Bluetooth leave many ways to get data on/off the device.

![Rasp Pi](/assets/rasp-pi.jpg)

[More Info](https://en.wikipedia.org/wiki/Raspberry_Pi)

#### Raspberry Pi Zero

The Raspberry Pi is relatively bulky to be worn on a mask. After we finish prototyping we'll either move to a smaller Raspberry Pi model, such as the Zero, or we'll go with our own custom boards.

Front

![Rasp Pi Zero front](/assets/rasp-pi-zero-front.jpg)

Back

![Rasp Pi Zero back](/assets/rasp-pi-zero-back.jpg)

[More Info](https://www.raspberrypi.org/blog/raspberry-pi-zero-w-joins-family/)

#### Raspberry Pi Camera

Facetop is a "voice first" UX. You can stream data to a phone or tablet over Bluetooth but there is no screen which sits over your eye(s) like with smart glasses. You can however snap photos and video as well as stream video using the Raspberry Pi Camera.

![Rasp Pi Camera](/assets/rasp-pi-camera.jpg)

[More Info](https://www.raspberrypi.org/products/camera-module-v2/)

## Tech Stack

![Tech Stack](/assets/facetop-tech-stack.jpg)

Facetop has a very rich software ecosystem. my.facetop.xyz is the dashboard where users sign in to view usage stats as well as interact with their Facetop. 

### my.facetop.xyz

As with [all of our software](https://github.com/EarthEngineering), my.facetop.xyz is 100% open source under the [MIT license](https://opensource.org/licenses/MIT) and can be found [on Github](https://github.com/EarthEngineering/my.facetop.xyz).

### rest.facetop.xyz

This can also be found [on Github](https://github.com/EarthEngineering/rest.facetop.xyz)

### Facetop OS

[on Github](https://github.com/EarthEngineering/facetop-os)