package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.ResourceCreateRequest;
import com.smartcampus.operations.dto.ResourceResponse;
import com.smartcampus.operations.dto.ResourceUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ResourceService {

    ResourceResponse createResource(ResourceCreateRequest request, String userEmail);

    ResourceResponse updateResource(UUID id, ResourceUpdateRequest request, String userEmail);

    void deleteResource(UUID id, String userEmail);

    ResourceResponse getResourceById(UUID id);

    Page<ResourceResponse> getAllResources(String type,
                                           String subtype,
                                           Integer minCapacity,
                                           Integer maxCapacity,
                                           String location,
                                           String status,
                                           String keyword,
                                           Pageable pageable);
}
