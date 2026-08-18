export interface LocationData {
  latitude: number;
  longitude: number;
  detectedCity: string;
  locationAddress: string;
  locationUpdatedAt: string;
}

/**
 * Capture current GPS position from browser/mobile device
 * and perform reverse geocoding to identify city and address.
 */
export async function captureGPSLocation(): Promise<LocationData | null> {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const timestamp = new Date().toISOString();

        let detectedCity = 'Cidade Desconhecida';
        let locationAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'pt-BR,pt;q=0.9',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.address) {
              const addr = data.address;
              const city =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.municipality ||
                addr.county ||
                addr.state_district ||
                '';
              const state = addr.state || '';
              const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || '';
              const road = addr.road || '';

              if (city) {
                detectedCity = city;
              }

              const parts = [road, neighbourhood, city, state].filter(Boolean);
              if (parts.length > 0) {
                locationAddress = parts.join(', ');
              } else if (data.display_name) {
                locationAddress = data.display_name;
              }
            }
          }
        } catch {
          // Ignora falha de geocoding reverso
        }

        resolve({
          latitude: lat,
          longitude: lng,
          detectedCity,
          locationAddress,
          locationUpdatedAt: timestamp,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
