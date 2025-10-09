# k3s-specific deployment examples for TwinFeed

# Basic k3s installation
helm install twinfeed ./helm/twinfeed \
  --create-namespace \
  --namespace twinfeed

# k3s with Traefik ingress (using k3s built-in Traefik)
helm install twinfeed ./helm/twinfeed \
  --set ingress.enabled=true \
  --set ingress.className="traefik" \
  --set ingress.hosts[0].host="twinfeed.local" \
  --create-namespace \
  --namespace twinfeed

# k3s with custom storage size
helm install twinfeed ./helm/twinfeed \
  --set backend.persistence.size=2Gi \
  --create-namespace \
  --namespace twinfeed

# k3s development setup with NodePort
helm install twinfeed ./helm/twinfeed \
  --set frontend.service.type=NodePort \
  --set backend.service.type=NodePort \
  --create-namespace \
  --namespace twinfeed

# k3s with LoadBalancer (if you have a LoadBalancer controller like MetalLB)
helm install twinfeed ./helm/twinfeed \
  --set frontend.service.type=LoadBalancer \
  --create-namespace \
  --namespace twinfeed

# k3s with resource limits for resource-constrained environments
helm install twinfeed ./helm/twinfeed \
  --set backend.resources.limits.cpu=200m \
  --set backend.resources.limits.memory=256Mi \
  --set frontend.resources.limits.cpu=100m \
  --set frontend.resources.limits.memory=128Mi \
  --create-namespace \
  --namespace twinfeed