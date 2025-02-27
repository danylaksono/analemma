class AnalemmaVisualizer {
  constructor(containerId, options = {}) {
    this.options = {
      latitude: 40.7128, // New York City
      longitude: -74.006,
      observationTime: "12:00",
      year: new Date().getFullYear(),
      markInterval: 7,
      showSunPath: true,
      showEarthGrid: true,
      showAnimatedSun: true,
      animationSpeed: 1,
      ...options,
    };

    this.container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.container.appendChild(this.renderer.domElement);

    // Controls
    if (typeof THREE.OrbitControls === "function") {
      this.controls = new THREE.OrbitControls(
        this.camera,
        this.renderer.domElement
      );
    } else if (typeof OrbitControls === "function") {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    } else {
      console.error("OrbitControls not found.");
      this.controls = { update: function () {} };
    }

    this.setupScene();
    window.addEventListener("resize", this.onWindowResize.bind(this));
    this.animate();
  }

  setupScene() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    this.createEarth();
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.setupInfoDisplay();
    this.camera.position.z = 5;
    this.createStarBackground();
    this.createAnalemma();
    this.clock = new THREE.Clock();
    this.animationDay = 0;
  }

  createEarth() {
    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    const textureLoader = new THREE.TextureLoader();

    try {
      const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0x2233ff,
        opacity: 0.6,
        transparent: true,
        specular: 0x333333,
        shininess: 5,
      });

      this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
      this.scene.add(this.earth);

      textureLoader.load(
        "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
        (texture) => {
          earthMaterial.map = texture;
          earthMaterial.needsUpdate = true;
        },
        undefined,
        (err) => console.warn("Earth texture could not be loaded.")
      );
    } catch (e) {
      const basicMaterial = new THREE.MeshPhongMaterial({
        color: 0x2233ff,
        opacity: 0.6,
        transparent: true,
      });
      this.earth = new THREE.Mesh(earthGeometry, basicMaterial);
      this.scene.add(this.earth);
    }

    if (this.options.showEarthGrid) {
      this.createEarthGrid();
    }
  }

  createEarthGrid() {
    if (this.earthGrid) {
      this.scene.remove(this.earthGrid);
    }

    this.earthGrid = new THREE.Object3D();

    for (let lat = -80; lat <= 80; lat += 20) {
      const latGeometry = new THREE.BufferGeometry();
      const points = [];

      for (let lng = 0; lng <= 360; lng += 5) {
        const phi = this.toRadians(90 - lat);
        const theta = this.toRadians(lng);

        const x = 1.001 * Math.sin(phi) * Math.cos(theta);
        const y = 1.001 * Math.sin(phi) * Math.sin(theta);
        const z = 1.001 * Math.cos(phi);

        points.push(new THREE.Vector3(x, y, z));
      }

      latGeometry.setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: lat === 0 ? 0xff0000 : 0xaaaaaa,
        transparent: true,
        opacity: 0.3,
        linewidth: lat === 0 ? 2 : 1,
      });
      this.earthGrid.add(new THREE.Line(latGeometry, material));
    }

    for (let lng = 0; lng < 360; lng += 20) {
      const lngGeometry = new THREE.BufferGeometry();
      const points = [];

      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = this.toRadians(90 - lat);
        const theta = this.toRadians(lng);

        const x = 1.001 * Math.sin(phi) * Math.cos(theta);
        const y = 1.001 * Math.sin(phi) * Math.sin(theta);
        const z = 1.001 * Math.cos(phi);

        points.push(new THREE.Vector3(x, y, z));
      }

      lngGeometry.setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: lng === 0 ? 0x00ff00 : 0xaaaaaa,
        transparent: true,
        opacity: 0.3,
        linewidth: lng === 0 ? 2 : 1,
      });
      this.earthGrid.add(new THREE.Line(lngGeometry, material));
    }

    this.scene.add(this.earthGrid);
  }

  createStarBackground() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = [];
    const colors = [];
    const sizes = [];
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const radius = 50;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      const starColor = Math.random() > 0.9 ? 0.7 + Math.random() * 0.3 : 1.0;
      color.setRGB(starColor, starColor, starColor);
      colors.push(color.r, color.g, color.b);
      sizes.push(0.5 + Math.random() * 1.5);
    }

    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    starGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
    starGeometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(sizes, 1)
    );

    const starMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  setupInfoDisplay() {
    this.infoElement = document.createElement("div");
    Object.assign(this.infoElement.style, {
      position: "absolute",
      bottom: "10px",
      left: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "10px",
      borderRadius: "5px",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      display: "none",
      pointerEvents: "none",
    });
    this.container.appendChild(this.infoElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener("mousemove", (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });
  }

  createAnalemma() {
    this.analemmaDayPoints = this.calculateAnalemmaPoints();
    this.originalAnalemmaPoints = [...this.analemmaDayPoints];

    const curve = new THREE.CatmullRomCurve3(this.analemmaDayPoints);
    const geometry = new THREE.TubeGeometry(curve, 366, 0.03, 8, false);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffaa00,
      emissive: 0xff5500,
      emissiveIntensity: 0.3,
    });

    if (this.analemma) this.scene.remove(this.analemma);
    this.analemma = new THREE.Mesh(geometry, material);
    this.analemma.userData.type = "analemma";
    this.scene.add(this.analemma);

    this.addDayMarkers(this.analemmaDayPoints);
    this.addObserverPosition();
    if (this.options.showAnimatedSun) this.addAnimatedSun();
    if (this.options.showSunPath) this.createDailySunPath();
  }

  addAnimatedSun() {
    if (this.animatedSun) {
      this.scene.remove(this.animatedSun);
      this.scene.remove(this.sunLight);
    }

    const sunGeometry = new THREE.SphereGeometry(0.08, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
    });

    this.animatedSun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.animatedSun.userData.type = "sun";
    if (this.analemmaDayPoints?.length > 0) {
      this.animatedSun.position.copy(this.analemmaDayPoints[0]);
    }

    this.sunLight = new THREE.PointLight(0xffffdd, 1, 10);
    this.sunLight.position.copy(this.animatedSun.position);

    this.scene.add(this.animatedSun);
    this.scene.add(this.sunLight);

    const sunGlowGeometry = new THREE.SphereGeometry(0.12, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3,
    });
    this.sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    this.animatedSun.add(this.sunGlow);
  }

  createDailySunPath() {
    if (this.dailySunPath) this.scene.remove(this.dailySunPath);

    const dayOfYear = this.animationDay || Math.floor(365 / 2);
    const date = new Date(this.options.year, 0, dayOfYear);
    const pathPoints = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const hourDate = new Date(date);
        hourDate.setHours(hour, minute, 0);

        const sunPosition = this.calculateSunPosition(
          hourDate,
          this.options.latitude,
          this.options.longitude
        );
        if (sunPosition.altitude < 0) continue;

        const point = this.sphericalToCartesian(
          sunPosition.altitude,
          sunPosition.azimuth,
          2
        );
        pathPoints.push(new THREE.Vector3(point.x, point.y, point.z));
      }
    }

    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMaterial = new THREE.LineDashedMaterial({
      color: 0x00ffff,
      dashSize: 0.1,
      gapSize: 0.05,
      linewidth: 2,
      transparent: true,
      opacity: 0.7,
    });

    this.dailySunPath = new THREE.Line(pathGeometry, pathMaterial);
    this.dailySunPath.computeLineDistances();
    this.dailySunPath.userData.type = "sunPath";
    this.scene.add(this.dailySunPath);

    this.addPathDayLabel(date, pathPoints);
  }

  addPathDayLabel(date, pathPoints) {
    if (this.pathDayLabel) this.scene.remove(this.pathDayLabel);

    let highestPoint = null;
    let maxAltitude = -Infinity;

    for (const point of pathPoints) {
      if (point.y > maxAltitude) {
        maxAltitude = point.y;
        highestPoint = point.clone();
      }
    }

    if (highestPoint) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 256;
      canvas.height = 64;

      const dateStr = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      context.font = "Bold 24px Arial";
      context.fillStyle = "rgba(255, 255, 255, 0.8)";
      context.fillText(dateStr, 10, 36);

      const texture = new THREE.CanvasTexture(canvas);
      this.pathDayLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture })
      );
      this.pathDayLabel.position.copy(highestPoint);
      this.pathDayLabel.position.y += 0.2;
      this.pathDayLabel.scale.set(0.5, 0.125, 1);
      this.scene.add(this.pathDayLabel);
    }
  }

  calculateAnalemmaPoints() {
    const points = [];
    const { latitude, longitude, observationTime, year } = this.options;
    const [hours, minutes] = observationTime.split(":").map(Number);

    for (let day = 1; day <= 366; day++) {
      const date = new Date(year, 0, day);
      if (date.getFullYear() > year) continue;

      date.setHours(hours, minutes, 0);
      const sunPosition = this.calculateSunPosition(date, latitude, longitude);
      const point = this.sphericalToCartesian(
        sunPosition.altitude,
        sunPosition.azimuth,
        2
      );
      points.push(new THREE.Vector3(point.x, point.y, point.z));
    }

    return points;
  }

  calculateSunPosition(date, latitude, longitude) {
    const jd = this.julianDate(date);
    const t = (jd - 2451545.0) / 36525;

    let L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    L0 = this.normalizeAngle(L0);

    let M = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    M = this.normalizeAngle(M);

    const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
    const C =
      (1.914602 - 0.004817 * t - 0.000014 * t * t) *
        Math.sin(this.toRadians(M)) +
      (0.019993 - 0.000101 * t) * Math.sin(this.toRadians(2 * M)) +
      0.000289 * Math.sin(this.toRadians(3 * M));

    const Ltrue = L0 + C;
    const obliq =
      23.439281 - 0.0130042 * t - 0.00000016 * t * t + 0.000000504 * t * t * t;
    const nutation = -0.0048 * Math.sin(this.toRadians(125.04 - 1934.136 * t));
    const trueObliq = obliq + nutation;

    const ra = this.toDegrees(
      Math.atan2(
        Math.cos(this.toRadians(trueObliq)) * Math.sin(this.toRadians(Ltrue)),
        Math.cos(this.toRadians(Ltrue))
      )
    );

    const dec = this.toDegrees(
      Math.asin(
        Math.sin(this.toRadians(trueObliq)) * Math.sin(this.toRadians(Ltrue))
      )
    );

    const E =
      4 *
      this.toDegrees(
        this.normalizeAngleRadians(
          this.calculateEquationOfTime(L0, e, M, trueObliq)
        )
      );

    const timeZoneOffset = date.getTimezoneOffset() / 60;
    const localTime =
      date.getUTCHours() + date.getUTCMinutes() / 60 + timeZoneOffset;
    const ha = this.normalizeAngle((localTime - 12) * 15 + longitude + E);

    const sinAlt =
      Math.sin(this.toRadians(latitude)) * Math.sin(this.toRadians(dec)) +
      Math.cos(this.toRadians(latitude)) *
        Math.cos(this.toRadians(dec)) *
        Math.cos(this.toRadians(ha));
    const altitude = this.toDegrees(
      Math.asin(Math.max(-1, Math.min(1, sinAlt)))
    );

    const cosAz =
      (Math.sin(this.toRadians(dec)) -
        Math.sin(this.toRadians(latitude)) * sinAlt) /
      (Math.cos(this.toRadians(latitude)) * Math.cos(this.toRadians(altitude)));

    let azimuth = this.toDegrees(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (Math.sin(this.toRadians(ha)) > 0) azimuth = 360 - azimuth;

    return {
      altitude,
      azimuth,
      declination: dec,
      rightAscension: ra,
      hourAngle: ha,
    };
  }

  calculateEquationOfTime(L0, e, M, obliq) {
    const y = Math.tan(this.toRadians(obliq) / 2) ** 2;
    return (
      y * Math.sin(2 * this.toRadians(L0)) -
      2 * e * Math.sin(this.toRadians(M)) +
      4 *
        e *
        y *
        Math.sin(this.toRadians(M)) *
        Math.cos(2 * this.toRadians(L0)) -
      0.5 * y * y * Math.sin(4 * this.toRadians(L0)) -
      1.25 * e * e * Math.sin(2 * this.toRadians(M))
    );
  }

  julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  sphericalToCartesian(altitude, azimuth, radius) {
    const phi = this.toRadians(90 - altitude);
    const theta = this.toRadians(azimuth);
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
    };
  }

  addDayMarkers(points) {
    if (this.markers) {
      this.markers.forEach((marker) => this.scene.remove(marker));
    }

    this.markers = [];
    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const firstDayMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const specialMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const regularMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    for (let i = 0; i < points.length; i += this.options.markInterval) {
      let material,
        isSpecial = false;

      if (i === 0) material = firstDayMaterial;
      else if (i === 79 || i === 171 || i === 265 || i === 354) {
        material = specialMaterial;
        isSpecial = true;
      } else material = regularMaterial;

      const marker = new THREE.Mesh(markerGeometry, material);
      marker.position.copy(points[i]);
      marker.userData = { type: "marker", dayIndex: i, isSpecial };
      this.markers.push(marker);
      this.scene.add(marker);
    }
  }

  addObserverPosition() {
    if (this.observer) this.scene.remove(this.observer);

    const { latitude, longitude } = this.options;
    const phi = this.toRadians(90 - latitude);
    const theta = this.toRadians(longitude);

    const geometry = new THREE.ConeGeometry(0.1, 0.2, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    this.observer = new THREE.Mesh(geometry, material);

    this.observer.position.set(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    );
    this.observer.lookAt(0, 0, 0);
    this.observer.rotateX(Math.PI / 2);
    this.scene.add(this.observer);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    const delta = this.clock.getDelta();

    if (this.options.showAnimatedSun && this.analemmaDayPoints?.length > 0) {
      this.updateAnimatedSun(delta);
    }

    this.checkHoverInteractions();
    if (this.stars) this.stars.rotation.y += delta * 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  updateAnimatedSun(delta) {
    this.animationDay += delta * this.options.animationSpeed * 10;
    if (this.animationDay >= this.analemmaDayPoints.length) {
      this.animationDay = 0;
      if (this.options.showSunPath) this.createDailySunPath();
    }

    const dayIndex = Math.floor(this.animationDay);
    const fraction = this.animationDay - dayIndex;
    const currentPos = this.analemmaDayPoints[dayIndex];
    const nextIndex = (dayIndex + 1) % this.analemmaDayPoints.length;
    const nextPos = this.analemmaDayPoints[nextIndex];

    if (currentPos && nextPos && this.animatedSun) {
      this.animatedSun.position.lerpVectors(currentPos, nextPos, fraction);
      if (this.sunLight) this.sunLight.position.copy(this.animatedSun.position);

      if (
        Math.floor(this.animationDay) !==
        Math.floor(this.animationDay - delta * this.options.animationSpeed * 10)
      ) {
        if (this.options.showSunPath) this.createDailySunPath();
      }
    }
  }

  checkHoverInteractions() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectObjects = [...(this.markers || []), this.animatedSun].filter(
      Boolean
    );
    const intersects = this.raycaster.intersectObjects(intersectObjects);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = "pointer";
      this.showObjectInfo(intersects[0].object);
    } else {
      this.renderer.domElement.style.cursor = "auto";
      this.infoElement.style.display = "none";
    }
  }

  showObjectInfo(object) {
    this.infoElement.style.display = "block";

    if (object === this.animatedSun || object === this.sunGlow) {
      const dayIndex = Math.floor(this.animationDay);
      const date = new Date(this.options.year, 0, dayIndex + 1);
      const [hours, minutes] = this.options.observationTime
        .split(":")
        .map(Number);
      const timeStr = new Date(0, 0, 0, hours, minutes).toLocaleTimeString(
        undefined,
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      const sunPosition = this.calculateSunPosition(
        new Date(date.setHours(hours, minutes, 0)),
        this.options.latitude,
        this.options.longitude
      );

      this.infoElement.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px;">Sun Position</div>
          <div>Date: ${date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}</div>
          <div>Time: ${timeStr}</div>
          <div>Altitude: ${sunPosition.altitude.toFixed(2)}°</div>
          <div>Azimuth: ${sunPosition.azimuth.toFixed(2)}°</div>
        `;
    } else if (object.userData?.dayIndex !== undefined) {
      const dayIndex = object.userData.dayIndex;
      const date = new Date(this.options.year, 0, dayIndex + 1);
      const [hours, minutes] = this.options.observationTime
        .split(":")
        .map(Number);
      const timeStr = new Date(0, 0, 0, hours, minutes).toLocaleTimeString(
        undefined,
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      let dayTypeInfo = "";
      if (dayIndex === 0) dayTypeInfo = "First day of year";
      else if (object.userData.isSpecial) {
        if (dayIndex === 79) dayTypeInfo = "Spring Equinox (approx.)";
        else if (dayIndex === 171) dayTypeInfo = "Summer Solstice (approx.)";
        else if (dayIndex === 265) dayTypeInfo = "Fall Equinox (approx.)";
        else if (dayIndex === 354) dayTypeInfo = "Winter Solstice (approx.)";
      }

      const sunPosition = this.calculateSunPosition(
        new Date(date.setHours(hours, minutes, 0)),
        this.options.latitude,
        this.options.longitude
      );

      this.infoElement.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px;">${date.toLocaleDateString(
            undefined,
            { year: "numeric", month: "short", day: "numeric" }
          )}</div>
          <div>Day of year: ${dayIndex + 1}</div>
          <div>Time: ${timeStr}</div>
          ${
            dayTypeInfo
              ? `<div style="color: #ffcc00;">${dayTypeInfo}</div>`
              : ""
          }
          <div>Altitude: ${sunPosition.altitude.toFixed(2)}°</div>
          <div>Azimuth: ${sunPosition.azimuth.toFixed(2)}°</div>
        `;
    }
  }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.createAnalemma();
    if (this.options.showEarthGrid !== this.earthGrid?.visible) {
      this.createEarthGrid();
    }
    this.addObserverPosition();
  }

  toggleElement(elementType) {
    switch (elementType) {
      case "earth":
        if (this.earth) this.earth.visible = !this.earth.visible;
        break;
      case "grid":
        if (this.earthGrid) {
          this.options.showEarthGrid = !this.options.showEarthGrid;
          this.earthGrid.visible = this.options.showEarthGrid;
        }
        break;
      case "analemma":
        if (this.analemma) this.analemma.visible = !this.analemma.visible;
        break;
      case "sun":
        if (this.animatedSun) {
          this.options.showAnimatedSun = !this.options.showAnimatedSun;
          this.animatedSun.visible = this.options.showAnimatedSun;
          if (this.sunLight)
            this.sunLight.visible = this.options.showAnimatedSun;
        }
        break;
      case "sunPath":
        if (this.dailySunPath) {
          this.options.showSunPath = !this.options.showSunPath;
          this.dailySunPath.visible = this.options.showSunPath;
          if (this.pathDayLabel)
            this.pathDayLabel.visible = this.options.showSunPath;
        }
        break;
      case "stars":
        if (this.stars) this.stars.visible = !this.stars.visible;
        break;
    }
  }

  setAnimationSpeed(speed) {
    this.options.animationSpeed = Math.max(0, Math.min(10, speed));
  }

  jumpToDay(dayOfYear) {
    this.animationDay = Math.max(
      0,
      Math.min(this.analemmaDayPoints.length - 1, dayOfYear)
    );
    if (this.options.showSunPath) this.createDailySunPath();
    this.updateAnimatedSun(0);
  }

  exportAsImage() {
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `analemma_${this.options.latitude}_${this.options.longitude}_${this.options.year}.png`;
    link.href = dataURL;
    link.click();
  }

  toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }
  toDegrees(radians) {
    return (radians * 180) / Math.PI;
  }
  normalizeAngle(degrees) {
    return ((degrees % 360) + 360) % 360;
  }
  normalizeAngleRadians(radians) {
    return ((radians % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }
}
