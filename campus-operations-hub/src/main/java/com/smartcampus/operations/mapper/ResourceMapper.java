package com.smartcampus.operations.mapper;

import com.smartcampus.operations.dto.ResourceCreateRequest;
import com.smartcampus.operations.dto.ResourceResponse;
import com.smartcampus.operations.entity.Resource;
import org.springframework.stereotype.Component;

@Component
public class ResourceMapper {

    public Resource toEntity(ResourceCreateRequest req) {
        return Resource.builder()
                .name(req.getName())
                .type(req.getType())
                .subtype(req.getSubtype())
                .capacity(req.getCapacity())
                .location(req.getLocation())
                .status(req.getStatus())
                .imageId(req.getImageId())
                .build();
    }

    public ResourceResponse toResponse(Resource r) {
        String imageUrl = null;
        if (r.getImageId() != null) {
            imageUrl = "/api/resources/" + r.getId() + "/image";
        }

        return ResourceResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .type(r.getType())
                .subtype(r.getSubtype())
                .capacity(r.getCapacity())
                .location(r.getLocation())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .imageUrl(imageUrl)
                .maintenanceMode(r.getMaintenanceMode())
                .maintenanceStartDate(r.getMaintenanceStartDate())
                .maintenanceEndDate(r.getMaintenanceEndDate())
                .maintenanceReason(r.getMaintenanceReason())
                .build();
    }
}
