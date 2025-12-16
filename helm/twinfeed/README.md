# TwinFeed Helm Chart

A Helm chart for deploying TwinFeed, a mobile-friendly breastfeeding tracker designed for parents of twins.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure (for persistence)

## Installing the Chart

To install the chart with the release name `twinfeed`:

```bash
# Add the repository (once you publish it)
helm repo add twinfeed https://your-helm-repo.com

# Install the chart
helm install twinfeed twinfeed/twinfeed

# Or install from local source
helm install twinfeed ./helm/twinfeed
```

## Uninstalling the Chart

To uninstall/delete the `twinfeed` deployment:

```bash
helm delete twinfeed
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the TwinFeed chart and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageTag` | Global Docker image tag override | `""` |
| `global.imagePullPolicy` | Global image pull policy override | `""` |

### Common Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of TwinFeed replicas | `1` |
| `nameOverride` | String to partially override twinfeed.fullname | `""` |
| `fullnameOverride` | String to fully override twinfeed.fullname | `""` |

### Image Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.backend.repository` | Backend image repository | `ghcr.io/mrowling/twinfeed-backend` |
| `image.backend.tag` | Backend image tag | `"latest"` |
| `image.backend.pullPolicy` | Backend image pull policy | `IfNotPresent` |
| `image.frontend.repository` | Frontend image repository | `ghcr.io/mrowling/twinfeed-frontend` |
| `image.frontend.tag` | Frontend image tag | `"latest"` |
| `image.frontend.pullPolicy` | Frontend image pull policy | `IfNotPresent` |
| `imagePullSecrets` | Global Docker registry secret names as an array | `[]` |

### Backend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.service.type` | Backend service type | `ClusterIP` |
| `backend.service.port` | Backend service port | `8080` |
| `backend.service.targetPort` | Backend container port | `8080` |
| `backend.env.GIN_MODE` | Gin framework mode | `"release"` |
| `backend.env.DB_PATH` | Database file path | `"/data/twinfeed.db"` |
| `backend.env.PORT` | Backend server port | `"8080"` |
| `backend.persistence.enabled` | Enable persistence for backend data | `true` |
| `backend.persistence.storageClass` | Storage class for backend PVC | `""` |
| `backend.persistence.accessMode` | Access mode for backend PVC | `ReadWriteOnce` |
| `backend.persistence.size` | Size of backend PVC | `1Gi` |
| `backend.resources` | Backend resource limits and requests | `{}` |

### Frontend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.service.type` | Frontend service type | `ClusterIP` |
| `frontend.service.port` | Frontend service port | `80` |
| `frontend.service.targetPort` | Frontend container port | `80` |
| `frontend.resources` | Frontend resource limits and requests | `{}` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress record generation | `false` |
| `ingress.className` | IngressClass that will be be used | `""` |
| `ingress.annotations` | Additional annotations for the Ingress resource | `{}` |
| `ingress.hosts` | An array with hosts and paths | `[{"host": "twinfeed.local", "paths": [{"path": "/", "pathType": "Prefix"}]}]` |
| `ingress.tls` | TLS configuration for ingress | `[]` |

### Autoscaling Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable Horizontal Pod Autoscaler | `false` |
| `autoscaling.minReplicas` | Minimum number of replicas | `1` |
| `autoscaling.maxReplicas` | Maximum number of replicas | `100` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization percentage | `80` |
| `autoscaling.targetMemoryUtilizationPercentage` | Target Memory utilization percentage | `""` |

### Security Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `serviceAccount.create` | Specifies whether a service account should be created | `true` |
| `serviceAccount.annotations` | Annotations to add to the service account | `{}` |
| `serviceAccount.name` | The name of the service account to use | `""` |
| `podAnnotations` | Annotations to add to pods | `{}` |
| `podSecurityContext` | Configure Pod Security Context | `{}` |
| `securityContext` | Configure Container Security Context | `{}` |

### Other Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nodeSelector` | Node labels for pod assignment | `{}` |
| `tolerations` | Tolerations for pod assignment | `[]` |
| `affinity` | Affinity for pod assignment | `{}` |
| `volumes` | Additional volumes | `[]` |
| `volumeMounts` | Additional volume mounts | `[]` |

## Examples

### Basic Installation

```bash
helm install twinfeed ./helm/twinfeed
```

### Development Installation

```bash
helm install twinfeed ./helm/twinfeed -f helm/twinfeed/values-dev.yaml
```

### Production Installation with Custom Values

```bash
helm install twinfeed ./helm/twinfeed \
  --set global.imageTag=v1.0.0 \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=twinfeed.example.com \
  --set backend.persistence.size=10Gi \
  --set autoscaling.enabled=true
```

### Production Installation with Values File

```bash
# Create custom production values
cat > my-values.yaml << EOF
global:
  imageTag: "v1.0.0"

replicaCount: 3

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: twinfeed.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: twinfeed-tls
      hosts:
        - twinfeed.example.com

backend:
  persistence:
    size: 10Gi
    storageClass: "fast-ssd"
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
EOF

helm install twinfeed ./helm/twinfeed -f my-values.yaml
```

## Upgrading

To upgrade the TwinFeed deployment:

```bash
# Upgrade to latest version
helm upgrade twinfeed ./helm/twinfeed

# Upgrade with specific version
helm upgrade twinfeed ./helm/twinfeed --set global.imageTag=v1.1.0

# Upgrade with values file
helm upgrade twinfeed ./helm/twinfeed -f my-values.yaml
```

## Testing

The chart includes basic connectivity tests:

```bash
# Run the tests
helm test twinfeed

# View test results
kubectl describe pod twinfeed-test
```

## Persistence

The backend component requires persistent storage for the SQLite database. By default, a PVC is created with 1Gi of storage. You can configure:

- Storage size via `backend.persistence.size`
- Storage class via `backend.persistence.storageClass`
- Disable persistence via `backend.persistence.enabled=false` (not recommended for production)

## Security Considerations

For production deployments, consider:

1. **Use specific image tags** instead of `latest`
2. **Enable security contexts** with non-root users
3. **Configure resource limits** to prevent resource exhaustion
4. **Use TLS/SSL** with proper certificates
5. **Enable network policies** if supported by your cluster
6. **Regular security updates** of base images

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check resource constraints and node capacity
2. **Storage issues**: Verify storage class and PVC status
3. **Networking issues**: Check service and ingress configuration
4. **Image pull errors**: Verify image repository access and credentials

### Debugging Commands

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=twinfeed

# View pod logs
kubectl logs -l app.kubernetes.io/name=twinfeed,app.kubernetes.io/component=backend
kubectl logs -l app.kubernetes.io/name=twinfeed,app.kubernetes.io/component=frontend

# Describe resources
kubectl describe deployment twinfeed-backend
kubectl describe deployment twinfeed-frontend

# Check persistent volumes
kubectl get pvc
kubectl describe pvc twinfeed-backend-data
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes to the Helm chart
4. Test your changes with `helm lint` and `helm template`
5. Submit a pull request

## License

This Helm chart is licensed under the MIT License - see the LICENSE file for details.